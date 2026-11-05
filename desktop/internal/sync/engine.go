package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/Siraj-T/cloud-todo/api/pkg/models"
	"github.com/Siraj-T/cloud-todo/desktop/internal/domain"
	"github.com/Siraj-T/cloud-todo/desktop/internal/notify"
	"github.com/Siraj-T/cloud-todo/desktop/internal/store"
)

// SyncStatus represents the current state of synchronization.
type SyncStatus string

const (
	StatusLocalOnly      SyncStatus = "LOCAL_ONLY"
	StatusOffline        SyncStatus = "OFFLINE"
	StatusPending        SyncStatus = "PENDING"
	StatusSynced         SyncStatus = "SYNCED"
	StatusConflict       SyncStatus = "CONFLICT"
	StatusSignInRequired SyncStatus = "SIGN_IN_REQUIRED"
)

// Engine orchestrates background synchronization between SQLite outbox and Cloud API.
type Engine struct {
	db          *store.DB
	client      *Client
	notifier    *notify.Notifier
	accountUID  string
	currentStatus SyncStatus
	cursor      string
	mu          sync.RWMutex
	stopChan    chan struct{}
}

// NewEngine creates a new synchronization engine.
func NewEngine(db *store.DB, client *Client, notifier *notify.Notifier, accountUID string) *Engine {
	status := StatusLocalOnly
	if accountUID != "" {
		status = StatusSynced
	}
	return &Engine{
		db:            db,
		client:        client,
		notifier:      notifier,
		accountUID:    accountUID,
		currentStatus: status,
		stopChan:      make(chan struct{}),
	}
}

// Status returns the current sync status.
func (e *Engine) Status() SyncStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.currentStatus
}

func (e *Engine) setStatus(status SyncStatus) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.currentStatus = status
}

// Start runs periodic sync every 15 seconds as specified in requirements.
func (e *Engine) Start(ctx context.Context) {
	if e.accountUID == "" {
		return
	}

	// Immediate initial sync
	_ = e.SyncOnce(ctx)

	ticker := time.NewTicker(15 * time.Second)
	go func() {
		for {
			select {
			case <-ticker.C:
				_ = e.SyncOnce(ctx)
			case <-e.stopChan:
				ticker.Stop()
				return
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}

// Stop halts the periodic sync.
func (e *Engine) Stop() {
	close(e.stopChan)
}

// SyncOnce performs a full push and pull cycle.
func (e *Engine) SyncOnce(ctx context.Context) error {
	if e.accountUID == "" {
		e.setStatus(StatusLocalOnly)
		return nil
	}

	// 1. Fetch pending outbox items
	outboxItems, err := e.db.ListPendingOutbox(ctx, e.accountUID, 50)
	if err != nil {
		return fmt.Errorf("failed to read outbox: %w", err)
	}

	if len(outboxItems) > 0 {
		e.setStatus(StatusPending)

		mutations := make([]models.PushMutationRequest, len(outboxItems))
		for i, item := range outboxItems {
			var payload map[string]interface{}
			_ = json.Unmarshal([]byte(item.Payload), &payload)
			mutations[i] = models.PushMutationRequest{
				MutationID:  item.MutationID,
				EntityID:    item.EntityID,
				BaseVersion: item.BaseVersion,
				Operation:   item.Operation,
				Payload:     payload,
			}
		}

		// Push to server
		resp, err := e.client.PushMutations(ctx, mutations)
		if err != nil {
			log.Printf("Sync push error: %v", err)
			e.setStatus(StatusOffline)
			return err
		}

		hasConflict := false
		for _, res := range resp.Results {
			if res.Status == "conflict" {
				hasConflict = true
				_ = e.notifier.ShowToast(
					"Sync Conflict Detected",
					fmt.Sprintf("Concurrent edit on task %s. Please review and choose a version.", res.MutationID),
					notify.CategorySyncConflict,
					"conflict-"+res.MutationID,
				)
			}
		}

		if hasConflict {
			e.setStatus(StatusConflict)
		} else {
			e.setStatus(StatusSynced)
		}
	}

	// 2. Pull remote changes
	pullResp, err := e.client.PullChanges(ctx, e.cursor)
	if err != nil {
		e.setStatus(StatusOffline)
		return err
	}

	if len(pullResp.Changes) > 0 {
		for _, change := range pullResp.Changes {
			if change.Operation == "CREATE" || change.Operation == "UPDATE" {
				// Apply incoming change to local store
				title, _ := change.Entity["title"].(string)
				task := &domain.Task{
					ID:        change.EntityID,
					OwnerUID:  e.accountUID,
					Title:     title,
					Version:   change.Version,
					UpdatedAt: change.Timestamp,
				}
				_ = e.db.SaveTaskAtomic(ctx, task, nil)
			}
		}
		e.cursor = pullResp.NextCursor
	}

	if e.Status() != StatusConflict {
		e.setStatus(StatusSynced)
	}

	return nil
}
