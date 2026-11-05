package store

import (
	"time"
)

// OutboxItem represents a queued mutation to be synced to the cloud.
type OutboxItem struct {
	MutationID       string    `json:"mutationId"`
	AccountPartition string    `json:"accountPartition"`
	EntityID         string    `json:"entityId"`
	BaseVersion      int64     `json:"baseVersion"`
	Operation        string    `json:"operation"` // CREATE, UPDATE, DELETE
	Payload          string    `json:"payload"`   // JSON payload of the entity
	State            string    `json:"state"`     // PENDING, IN_FLIGHT, FAILED, CONFLICT
	Attempts         int       `json:"attempts"`
	LastError        *string   `json:"lastError,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
}

// Outbox states
const (
	OutboxStatePending  = "PENDING"
	OutboxStateInFlight = "IN_FLIGHT"
	OutboxStateFailed   = "FAILED"
	OutboxStateConflict = "CONFLICT"
)

// Operations
const (
	OpCreate = "CREATE"
	OpUpdate = "UPDATE"
	OpDelete = "DELETE"
)

// TaskFilter specifies query parameters for tasks.
type TaskFilter struct {
	OwnerUID        string
	ProjectID       *string // If nil and GlobalOnly is true -> only tasks with project_id IS NULL
	GlobalOnly      bool
	ParentID        *string // Filter by parent
	RootOnly        bool    // parent_id IS NULL
	IncludeDeleted  bool
	IncludeCompleted bool
}
