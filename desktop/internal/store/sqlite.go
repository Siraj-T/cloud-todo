package store

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Siraj-T/cloud-todo/desktop/internal/domain"
	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// DB wraps a SQLite connection pool with migration and transactional helpers.
type DB struct {
	db *sql.DB
	mu sync.RWMutex
}

// Open opens a SQLite database at the specified path and runs migrations.
// In-memory databases can be specified with ":memory:".
func Open(path string) (*DB, error) {
	dsn := path
	if path != ":memory:" {
		// WAL mode for concurrency, busy timeout to avoid locked errors, foreign keys enabled
		dsn = fmt.Sprintf("%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(ON)", path)
	}

	sqlDB, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Optimize connection pool for SQLite
	if path == ":memory:" {
		sqlDB.SetMaxOpenConns(1) // Keep single connection for in-memory database
	} else {
		sqlDB.SetMaxOpenConns(10)
		sqlDB.SetMaxIdleConns(5)
	}

	s := &DB{db: sqlDB}
	if err := s.migrate(); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("failed to apply migrations: %w", err)
	}

	return s, nil
}

// Close closes the database connection.
func (d *DB) Close() error {
	return d.db.Close()
}

// migrate applies any unapplied SQL migration files in order.
func (d *DB) migrate() error {
	d.mu.Lock()
	d.mu.Unlock()

	ctx := context.Background()

	// Ensure schema_migrations table exists
	_, err := d.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at TEXT NOT NULL
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// Query existing versions
	rows, err := d.db.QueryContext(ctx, `SELECT version FROM schema_migrations ORDER BY version ASC`)
	if err != nil {
		return fmt.Errorf("failed to read schema_migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[int]bool)
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			return err
		}
		applied[v] = true
	}

	// Read migration files from embedded FS
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("failed to read embedded migrations dir: %w", err)
	}

	type migrationFile struct {
		version  int
		fileName string
	}
	var files []migrationFile

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		// Expect name like 001_initial.sql
		parts := strings.SplitN(entry.Name(), "_", 2)
		if len(parts) < 2 {
			continue
		}
		v, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}
		files = append(files, migrationFile{version: v, fileName: entry.Name()})
	}

	sort.Slice(files, func(i, j int) bool {
		return files[i].version < files[j].version
	})

	for _, mf := range files {
		if applied[mf.version] {
			continue
		}

		content, err := migrationsFS.ReadFile("migrations/" + mf.fileName)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", mf.fileName, err)
		}

		tx, err := d.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to begin migration transaction for %s: %w", mf.fileName, err)
		}

		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to execute migration %s: %w", mf.fileName, err)
		}

		if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`, mf.version, time.Now().UTC().Format(time.RFC3339)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", mf.fileName, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", mf.fileName, err)
		}
	}

	return nil
}

// SaveTaskAtomic commits a task mutation and its corresponding outbox record in one transaction.
// If either fails, the entire transaction rolls back, preserving the previous state.
func (d *DB) SaveTaskAtomic(ctx context.Context, task *domain.Task, outbox *OutboxItem) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	tagsJSON, err := json.Marshal(task.Tags)
	if err != nil {
		return fmt.Errorf("failed to marshal tags: %w", err)
	}

	var deletedAtStr *string
	if task.DeletedAt != nil {
		s := task.DeletedAt.UTC().Format(time.RFC3339)
		deletedAtStr = &s
	}

	completedInt := 0
	if task.Completed {
		completedInt = 1
	}

	query := `
		INSERT INTO tasks (
			id, owner_uid, project_id, parent_id, title, description,
			due_date, tags_json, completed, version, created_at, updated_at, deleted_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			project_id = excluded.project_id,
			parent_id = excluded.parent_id,
			title = excluded.title,
			description = excluded.description,
			due_date = excluded.due_date,
			tags_json = excluded.tags_json,
			completed = excluded.completed,
			version = excluded.version,
			updated_at = excluded.updated_at,
			deleted_at = excluded.deleted_at
	`

	_, err = tx.ExecContext(ctx, query,
		task.ID,
		task.OwnerUID,
		task.ProjectID,
		task.ParentID,
		task.Title,
		task.Description,
		task.DueDate,
		string(tagsJSON),
		completedInt,
		task.Version,
		task.CreatedAt.UTC().Format(time.RFC3339),
		task.UpdatedAt.UTC().Format(time.RFC3339),
		deletedAtStr,
	)
	if err != nil {
		return fmt.Errorf("failed to upsert task: %w", err)
	}

	// If an outbox item is specified, insert it within the same transaction
	if outbox != nil {
		outboxQuery := `
			INSERT INTO outbox (
				mutation_id, account_partition, entity_id, base_version,
				operation, payload, state, attempts, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		_, err = tx.ExecContext(ctx, outboxQuery,
			outbox.MutationID,
			outbox.AccountPartition,
			outbox.EntityID,
			outbox.BaseVersion,
			outbox.Operation,
			outbox.Payload,
			outbox.State,
			outbox.Attempts,
			outbox.CreatedAt.UTC().Format(time.RFC3339),
		)
		if err != nil {
			return fmt.Errorf("failed to insert outbox item: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetTask returns a single task by ID.
func (d *DB) GetTask(ctx context.Context, id string) (*domain.Task, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `
		SELECT id, owner_uid, project_id, parent_id, title, description,
		       due_date, tags_json, completed, version, created_at, updated_at, deleted_at
		FROM tasks
		WHERE id = ?
	`
	row := d.db.QueryRowContext(ctx, query, id)

	var t domain.Task
	var tagsJSON string
	var completedInt int
	var createdAtStr, updatedAtStr string
	var deletedAtStr *string

	err := row.Scan(
		&t.ID,
		&t.OwnerUID,
		&t.ProjectID,
		&t.ParentID,
		&t.Title,
		&t.Description,
		&t.DueDate,
		&tagsJSON,
		&completedInt,
		&t.Version,
		&createdAtStr,
		&updatedAtStr,
		&deletedAtStr,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query task: %w", err)
	}

	t.Completed = completedInt == 1
	_ = json.Unmarshal([]byte(tagsJSON), &t.Tags)
	t.CreatedAt, _ = time.Parse(time.RFC3339, createdAtStr)
	t.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAtStr)
	if deletedAtStr != nil {
		parsed, _ := time.Parse(time.RFC3339, *deletedAtStr)
		t.DeletedAt = &parsed
	}

	return &t, nil
}

// ListTasks returns tasks matching the filter.
func (d *DB) ListTasks(ctx context.Context, filter TaskFilter) ([]domain.Task, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var sb strings.Builder
	var args []interface{}

	sb.WriteString(`
		SELECT id, owner_uid, project_id, parent_id, title, description,
		       due_date, tags_json, completed, version, created_at, updated_at, deleted_at
		FROM tasks
		WHERE 1=1
	`)

	if filter.OwnerUID != "" {
		sb.WriteString(" AND owner_uid = ?")
		args = append(args, filter.OwnerUID)
	}

	if filter.GlobalOnly {
		sb.WriteString(" AND project_id IS NULL")
	} else if filter.ProjectID != nil {
		sb.WriteString(" AND project_id = ?")
		args = append(args, *filter.ProjectID)
	}

	if filter.RootOnly {
		sb.WriteString(" AND parent_id IS NULL")
	} else if filter.ParentID != nil {
		sb.WriteString(" AND parent_id = ?")
		args = append(args, *filter.ParentID)
	}

	if !filter.IncludeDeleted {
		sb.WriteString(" AND deleted_at IS NULL")
	}

	if !filter.IncludeCompleted {
		sb.WriteString(" AND completed = 0")
	}

	sb.WriteString(" ORDER BY created_at DESC")

	rows, err := d.db.QueryContext(ctx, sb.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}
	defer rows.Close()

	var tasks []domain.Task
	for rows.Next() {
		var t domain.Task
		var tagsJSON string
		var completedInt int
		var createdAtStr, updatedAtStr string
		var deletedAtStr *string

		err := rows.Scan(
			&t.ID,
			&t.OwnerUID,
			&t.ProjectID,
			&t.ParentID,
			&t.Title,
			&t.Description,
			&t.DueDate,
			&tagsJSON,
			&completedInt,
			&t.Version,
			&createdAtStr,
			&updatedAtStr,
			&deletedAtStr,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}

		t.Completed = completedInt == 1
		_ = json.Unmarshal([]byte(tagsJSON), &t.Tags)
		t.CreatedAt, _ = time.Parse(time.RFC3339, createdAtStr)
		t.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAtStr)
		if deletedAtStr != nil {
			parsed, _ := time.Parse(time.RFC3339, *deletedAtStr)
			t.DeletedAt = &parsed
		}

		tasks = append(tasks, t)
	}

	return tasks, nil
}

// GetCascadeDeleteCount calculates how many tasks will be affected if taskID or projectID is deleted.
// For a parent task: returns 1 (the parent) + count of direct subtasks.
func (d *DB) GetTaskCascadeCount(ctx context.Context, taskID string) (int, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var subtaskCount int
	err := d.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM tasks WHERE parent_id = ? AND deleted_at IS NULL`, taskID).Scan(&subtaskCount)
	if err != nil {
		return 0, err
	}
	return 1 + subtaskCount, nil
}

// GetProjectCascadeCount returns how many active tasks belong to this project.
func (d *DB) GetProjectCascadeCount(ctx context.Context, projectID string) (int, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var count int
	err := d.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM tasks WHERE project_id = ? AND deleted_at IS NULL`, projectID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// CascadeDeleteTask sets deleted_at on the parent task AND all its subtasks atomically,
// while queueing the corresponding outbox mutation.
func (d *DB) CascadeDeleteTask(ctx context.Context, taskID string, outbox *OutboxItem) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	now := time.Now().UTC().Format(time.RFC3339)

	// Soft delete parent
	_, err = tx.ExecContext(ctx, `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?`, now, now, taskID)
	if err != nil {
		return fmt.Errorf("failed to delete parent task: %w", err)
	}

	// Soft delete children
	_, err = tx.ExecContext(ctx, `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE parent_id = ?`, now, now, taskID)
	if err != nil {
		return fmt.Errorf("failed to delete child tasks: %w", err)
	}

	if outbox != nil {
		outboxQuery := `
			INSERT INTO outbox (
				mutation_id, account_partition, entity_id, base_version,
				operation, payload, state, attempts, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		_, err = tx.ExecContext(ctx, outboxQuery,
			outbox.MutationID,
			outbox.AccountPartition,
			outbox.EntityID,
			outbox.BaseVersion,
			outbox.Operation,
			outbox.Payload,
			outbox.State,
			outbox.Attempts,
			outbox.CreatedAt.UTC().Format(time.RFC3339),
		)
		if err != nil {
			return fmt.Errorf("failed to insert outbox delete: %w", err)
		}
	}

	return tx.Commit()
}

// ListPendingOutbox returns up to limit pending mutations for an account.
func (d *DB) ListPendingOutbox(ctx context.Context, accountPartition string, limit int) ([]OutboxItem, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `
		SELECT mutation_id, account_partition, entity_id, base_version,
		       operation, payload, state, attempts, last_error, created_at
		FROM outbox
		WHERE account_partition = ? AND state = ?
		ORDER BY created_at ASC
		LIMIT ?
	`
	rows, err := d.db.QueryContext(ctx, query, accountPartition, OutboxStatePending, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []OutboxItem
	for rows.Next() {
		var item OutboxItem
		var createdAtStr string
		err := rows.Scan(
			&item.MutationID,
			&item.AccountPartition,
			&item.EntityID,
			&item.BaseVersion,
			&item.Operation,
			&item.Payload,
			&item.State,
			&item.Attempts,
			&item.LastError,
			&createdAtStr,
		)
		if err != nil {
			return nil, err
		}
		item.CreatedAt, _ = time.Parse(time.RFC3339, createdAtStr)
		items = append(items, item)
	}

	return items, nil
}
