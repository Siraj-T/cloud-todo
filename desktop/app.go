package main

import (
	"context"
	"fmt"
	"time"

	"github.com/Siraj-T/cloud-todo/desktop/internal/domain"
	"github.com/Siraj-T/cloud-todo/desktop/internal/notify"
	"github.com/Siraj-T/cloud-todo/desktop/internal/store"
	appSync "github.com/Siraj-T/cloud-todo/desktop/internal/sync"
	"github.com/google/uuid"
)

// App is the desktop application service bridge.
type App struct {
	ctx        context.Context
	db         *store.DB
	syncEngine *appSync.Engine
	notifier   *notify.Notifier
	accountUID string
}

// NewApp creates a new application instance.
func NewApp(db *store.DB, syncEngine *appSync.Engine, notifier *notify.Notifier, accountUID string) *App {
	return &App{
		db:         db,
		syncEngine: syncEngine,
		notifier:   notifier,
		accountUID: accountUID,
	}
}

// Startup is called when the desktop window initializes.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	if a.syncEngine != nil {
		a.syncEngine.Start(ctx)
	}
}

// GetTasks returns all active tasks, optionally filtered by project.
func (a *App) GetTasks(projectID *string) ([]domain.Task, error) {
	filter := store.TaskFilter{
		OwnerUID:         a.accountUID,
		IncludeCompleted: true,
		IncludeDeleted:   false,
	}
	if projectID == nil {
		filter.GlobalOnly = true
	} else {
		filter.ProjectID = projectID
	}
	return a.db.ListTasks(a.ctx, filter)
}

// SaveTask validates and atomically commits a task and its outbox mutation.
func (a *App) SaveTask(task domain.Task) error {
	// 1. Validation
	if err := domain.ValidateTask(&task); err != nil {
		return err
	}

	if task.ID == "" {
		task.ID = uuid.NewString()
		task.CreatedAt = time.Now().UTC()
		task.OwnerUID = a.accountUID
	}
	task.UpdatedAt = time.Now().UTC()

	// 2. Prepare Outbox mutation
	op := store.OpCreate
	if task.Version > 1 {
		op = store.OpUpdate
	}

	outbox := &store.OutboxItem{
		MutationID:       uuid.NewString(),
		AccountPartition: a.accountUID,
		EntityID:         task.ID,
		BaseVersion:      task.Version,
		Operation:        op,
		Payload:          fmt.Sprintf(`{"id":%q,"title":%q,"description":%q}`, task.ID, task.Title, task.Description),
		State:            store.OutboxStatePending,
		CreatedAt:        time.Now().UTC(),
	}

	return a.db.SaveTaskAtomic(a.ctx, &task, outbox)
}

// DeleteTask performs atomic cascade deletion with outbox queuing.
func (a *App) DeleteTask(taskID string) error {
	outbox := &store.OutboxItem{
		MutationID:       uuid.NewString(),
		AccountPartition: a.accountUID,
		EntityID:         taskID,
		BaseVersion:      1,
		Operation:        store.OpDelete,
		Payload:          fmt.Sprintf(`{"id":%q}`, taskID),
		State:            store.OutboxStatePending,
		CreatedAt:        time.Now().UTC(),
	}
	return a.db.CascadeDeleteTask(a.ctx, taskID, outbox)
}

// GetTaskCascadeCount returns the number of tasks affected by deleting taskID.
func (a *App) GetTaskCascadeCount(taskID string) (int, error) {
	return a.db.GetTaskCascadeCount(a.ctx, taskID)
}

// TriggerSync forces an immediate sync cycle.
func (a *App) TriggerSync() (string, error) {
	if a.syncEngine == nil {
		return "LOCAL_ONLY", nil
	}
	err := a.syncEngine.SyncOnce(a.ctx)
	if err != nil {
		return string(a.syncEngine.Status()), err
	}
	return string(a.syncEngine.Status()), nil
}

// ShowNotification triggers a native toast notification.
func (a *App) ShowNotification(title, message, category string) {
	if a.notifier != nil {
		_ = a.notifier.ShowToast(title, message, category, "")
	}
}
