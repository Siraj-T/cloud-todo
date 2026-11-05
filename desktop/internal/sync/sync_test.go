package sync_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Siraj-T/cloud-todo/api/pkg/models"
	"github.com/Siraj-T/cloud-todo/desktop/internal/domain"
	"github.com/Siraj-T/cloud-todo/desktop/internal/notify"
	"github.com/Siraj-T/cloud-todo/desktop/internal/store"
	appSync "github.com/Siraj-T/cloud-todo/desktop/internal/sync"
)

func TestFullSyncCycle(t *testing.T) {
	// 1. Setup Mock API Server
	mux := http.NewServeMux()

	mux.HandleFunc("POST /sessions/enroll", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"sessionId":   "sess-test-1",
			"deviceToken": "mock-token-xyz",
		})
	})

	mux.HandleFunc("POST /sync/push", func(w http.ResponseWriter, r *http.Request) {
		var req models.PushBatchRequest
		_ = json.NewDecoder(r.Body).Decode(&req)

		results := make([]models.PushMutationResult, len(req.Mutations))
		for i, mut := range req.Mutations {
			results[i] = models.PushMutationResult{
				MutationID: mut.MutationID,
				Status:     "accepted",
				Version:    mut.BaseVersion + 1,
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(models.PushBatchResponse{Results: results})
	})

	mux.HandleFunc("GET /sync/pull", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(models.PullResponse{
			Changes:    []models.FeedChange{},
			NextCursor: "1",
			HasMore:    false,
		})
	})

	ts := httptest.NewServer(mux)
	defer ts.Close()

	// 2. Setup SQLite database
	db, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	// 3. Enroll device
	client := appSync.NewClient(ts.URL, "")
	_, deviceToken, err := client.EnrollSession(ctx, "user-tester", "Laptop", "windows")
	if err != nil {
		t.Fatalf("enrollment failed: %v", err)
	}
	client.SetDeviceToken(deviceToken)

	notifier := notify.NewNotifier(notify.DefaultPreferences())
	engine := appSync.NewEngine(db, client, notifier, "user-tester")

	// 4. Save local task + outbox item in SQLite
	taskID := "task-sync-1"
	task := &domain.Task{
		ID:        taskID,
		OwnerUID:  "user-tester",
		Title:     "Push me to the cloud",
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	outbox := &store.OutboxItem{
		MutationID:       "mut-sync-1",
		AccountPartition: "user-tester",
		EntityID:         taskID,
		BaseVersion:      0,
		Operation:        store.OpCreate,
		Payload:          `{"id":"task-sync-1","title":"Push me to the cloud"}`,
		State:            store.OutboxStatePending,
		CreatedAt:        time.Now().UTC(),
	}

	err = db.SaveTaskAtomic(ctx, task, outbox)
	if err != nil {
		t.Fatalf("SaveTaskAtomic failed: %v", err)
	}

	// 5. Trigger SyncOnce
	err = engine.SyncOnce(ctx)
	if err != nil {
		t.Fatalf("SyncOnce failed: %v", err)
	}

	if engine.Status() != appSync.StatusSynced {
		t.Errorf("expected engine status SYNCED, got %v", engine.Status())
	}
}
