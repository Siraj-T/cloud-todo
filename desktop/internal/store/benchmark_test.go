package store_test

import (
	"context"
	"fmt"
	"sort"
	"testing"
	"time"

	"github.com/Siraj-T/cloud-todo/desktop/internal/domain"
	"github.com/Siraj-T/cloud-todo/desktop/internal/store"
)

func TestSavePerformanceWith5000Tasks(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping 5000-task benchmark in short mode")
	}

	db := setupTestDB(t)
	ctx := context.Background()

	// 1. Seed 5,000 tasks
	t.Log("Seeding 5,000 tasks...")
	startSeed := time.Now()
	for i := 0; i < 5000; i++ {
		task := &domain.Task{
			ID:          fmt.Sprintf("seed-task-%d", i),
			OwnerUID:    "user-bench",
			Title:       fmt.Sprintf("Benchmark task #%d", i),
			Description: "Benchmark payload",
			Completed:   i%2 == 0,
			Version:     1,
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		}
		if err := db.SaveTaskAtomic(ctx, task, nil); err != nil {
			t.Fatalf("failed at seed task %d: %v", i, err)
		}
	}
	t.Logf("Seeded 5,000 tasks in %v", time.Since(startSeed))

	// 2. Measure 100 subsequent atomic saves on the 5,000-task store
	sampleCount := 100
	durations := make([]time.Duration, sampleCount)

	for i := 0; i < sampleCount; i++ {
		task := &domain.Task{
			ID:          fmt.Sprintf("sample-task-%d", i),
			OwnerUID:    "user-bench",
			Title:       fmt.Sprintf("Live save test #%d", i),
			Description: "Testing latency under 5k task load",
			Version:     1,
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		}
		outbox := &store.OutboxItem{
			MutationID:       fmt.Sprintf("sample-mut-%d", i),
			AccountPartition: "user-bench",
			EntityID:         task.ID,
			BaseVersion:      1,
			Operation:        store.OpCreate,
			Payload:          `{"sample":true}`,
			State:            store.OutboxStatePending,
			CreatedAt:        time.Now().UTC(),
		}

		t0 := time.Now()
		if err := db.SaveTaskAtomic(ctx, task, outbox); err != nil {
			t.Fatalf("save failed at iteration %d: %v", i, err)
		}
		durations[i] = time.Since(t0)
	}

	sort.Slice(durations, func(i, j int) bool {
		return durations[i] < durations[j]
	})

	p50 := durations[sampleCount*50/100]
	p95 := durations[sampleCount*95/100]
	p99 := durations[sampleCount*99/100]

	t.Logf("Benchmark Results (5,000 existing tasks):")
	t.Logf("  p50 latency: %v", p50)
	t.Logf("  p95 latency: %v", p95)
	t.Logf("  p99 latency: %v", p99)

	// Verify budget: p95 <= 100ms
	if p95 > 100*time.Millisecond {
		t.Errorf("p95 latency exceeded 100ms budget: got %v", p95)
	}
}
