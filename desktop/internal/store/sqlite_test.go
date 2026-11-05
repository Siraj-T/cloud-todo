package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/Siraj-T/cloud-todo/desktop/internal/domain"
	"github.com/Siraj-T/cloud-todo/desktop/internal/store"
)

func setupTestDB(t *testing.T) *store.DB {
	t.Helper()
	db, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("failed to open test in-memory db: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})
	return db
}

func TestMigrationAndSaveTaskAtomic(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	taskID := "task-atomic-1"
	task := &domain.Task{
		ID:          taskID,
		OwnerUID:    "user-1",
		Title:       "Test task",
		Description: "Detailed description",
		Tags:        []string{"go", "sqlite"},
		Completed:   false,
		Version:     1,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}

	outboxItem := &store.OutboxItem{
		MutationID:       "mut-1",
		AccountPartition: "user-1",
		EntityID:         taskID,
		BaseVersion:      1,
		Operation:        store.OpCreate,
		Payload:          `{"title":"Test task"}`,
		State:            store.OutboxStatePending,
		CreatedAt:        time.Now().UTC(),
	}

	// 1. Atomic Save
	err := db.SaveTaskAtomic(ctx, task, outboxItem)
	if err != nil {
		t.Fatalf("SaveTaskAtomic failed: %v", err)
	}

	// 2. Verify task persisted
	saved, err := db.GetTask(ctx, taskID)
	if err != nil {
		t.Fatalf("GetTask failed: %v", err)
	}
	if saved == nil {
		t.Fatal("expected saved task, got nil")
	}
	if saved.Title != task.Title {
		t.Errorf("got title %s, want %s", saved.Title, task.Title)
	}
	if len(saved.Tags) != 2 || saved.Tags[0] != "go" || saved.Tags[1] != "sqlite" {
		t.Errorf("got tags %v, want [go, sqlite]", saved.Tags)
	}

	// 3. Verify outbox persisted
	outboxItems, err := db.ListPendingOutbox(ctx, "user-1", 10)
	if err != nil {
		t.Fatalf("ListPendingOutbox failed: %v", err)
	}
	if len(outboxItems) != 1 {
		t.Fatalf("expected 1 outbox item, got %d", len(outboxItems))
	}
	if outboxItems[0].MutationID != "mut-1" {
		t.Errorf("got mutation ID %s, want mut-1", outboxItems[0].MutationID)
	}
}

func TestTaskQueriesAndFiltering(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	projID := "proj-1"
	parentID := "parent-root"

	// 1. Global root task
	_ = db.SaveTaskAtomic(ctx, &domain.Task{
		ID:        "global-1",
		OwnerUID:  "user-1",
		Title:     "Global task",
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}, nil)

	// 2. Project root task
	_ = db.SaveTaskAtomic(ctx, &domain.Task{
		ID:        parentID,
		OwnerUID:  "user-1",
		ProjectID: &projID,
		Title:     "Project root task",
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}, nil)

	// 3. Project subtask
	_ = db.SaveTaskAtomic(ctx, &domain.Task{
		ID:        "subtask-1",
		OwnerUID:  "user-1",
		ProjectID: &projID,
		ParentID:  &parentID,
		Title:     "Project subtask",
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}, nil)

	// Test Global Only Filter
	globals, err := db.ListTasks(ctx, store.TaskFilter{
		OwnerUID:   "user-1",
		GlobalOnly: true,
	})
	if err != nil {
		t.Fatalf("ListTasks GlobalOnly failed: %v", err)
	}
	if len(globals) != 1 || globals[0].ID != "global-1" {
		t.Errorf("expected only global-1, got %v", globals)
	}

	// Test Project Filter
	projTasks, err := db.ListTasks(ctx, store.TaskFilter{
		OwnerUID:  "user-1",
		ProjectID: &projID,
	})
	if err != nil {
		t.Fatalf("ListTasks ProjectID failed: %v", err)
	}
	if len(projTasks) != 2 {
		t.Errorf("expected 2 project tasks, got %d", len(projTasks))
	}

	// Test Root Only in Project
	rootTasks, err := db.ListTasks(ctx, store.TaskFilter{
		OwnerUID:  "user-1",
		ProjectID: &projID,
		RootOnly:  true,
	})
	if err != nil {
		t.Fatalf("ListTasks RootOnly failed: %v", err)
	}
	if len(rootTasks) != 1 || rootTasks[0].ID != parentID {
		t.Errorf("expected 1 root task (%s), got %v", parentID, rootTasks)
	}
}

func TestCascadeDeletion(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	parentID := "parent-cascade"
	childID := "child-cascade"

	_ = db.SaveTaskAtomic(ctx, &domain.Task{
		ID:        parentID,
		OwnerUID:  "user-1",
		Title:     "Parent",
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}, nil)

	_ = db.SaveTaskAtomic(ctx, &domain.Task{
		ID:        childID,
		OwnerUID:  "user-1",
		ParentID:  &parentID,
		Title:     "Child",
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}, nil)

	// 1. Verify Cascade Count: 1 parent + 1 child = 2
	count, err := db.GetTaskCascadeCount(ctx, parentID)
	if err != nil {
		t.Fatalf("GetTaskCascadeCount failed: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected cascade count 2, got %d", count)
	}

	// 2. Execute Cascade Delete
	deleteOutbox := &store.OutboxItem{
		MutationID:       "mut-del-1",
		AccountPartition: "user-1",
		EntityID:         parentID,
		BaseVersion:      1,
		Operation:        store.OpDelete,
		Payload:          `{"id":"parent-cascade"}`,
		State:            store.OutboxStatePending,
		CreatedAt:        time.Now().UTC(),
	}

	err = db.CascadeDeleteTask(ctx, parentID, deleteOutbox)
	if err != nil {
		t.Fatalf("CascadeDeleteTask failed: %v", err)
	}

	// 3. Verify neither is returned in non-deleted queries
	active, err := db.ListTasks(ctx, store.TaskFilter{
		OwnerUID:       "user-1",
		IncludeDeleted: false,
	})
	if err != nil {
		t.Fatalf("ListTasks failed: %v", err)
	}
	if len(active) != 0 {
		t.Fatalf("expected 0 active tasks after cascade delete, got %d", len(active))
	}

	// 4. Verify tombstones exist
	parent, _ := db.GetTask(ctx, parentID)
	if parent.DeletedAt == nil {
		t.Error("parent tombstone DeletedAt is nil")
	}
	child, _ := db.GetTask(ctx, childID)
	if child.DeletedAt == nil {
		t.Error("child tombstone DeletedAt is nil")
	}

	// 5. Verify outbox has delete mutation
	outboxItems, _ := db.ListPendingOutbox(ctx, "user-1", 10)
	if len(outboxItems) != 1 || outboxItems[0].Operation != store.OpDelete {
		t.Errorf("expected outbox delete mutation, got %v", outboxItems)
	}
}

