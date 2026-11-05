package models

import (
	"time"
)

// Session represents an enrolled device session.
type Session struct {
	SessionID  string     `json:"sessionId"`
	UID        string     `json:"uid"`
	DeviceName string     `json:"deviceName"`
	Platform   string     `json:"platform"`
	TokenHash  string     `json:"-"`
	FCMToken   *string    `json:"fcmToken,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	LastSeenAt time.Time  `json:"lastSeenAt"`
	RevokedAt  *time.Time `json:"revokedAt,omitempty"`
	IsCurrent  bool       `json:"isCurrent,omitempty"`
}

// PushMutationRequest represents an incoming mutation in a sync push batch.
type PushMutationRequest struct {
	MutationID  string                 `json:"mutationId"`
	EntityID    string                 `json:"entityId"`
	BaseVersion int64                  `json:"baseVersion"`
	Operation   string                 `json:"operation"` // CREATE, UPDATE, DELETE
	Payload     map[string]interface{} `json:"payload"`
}

// PushMutationResult represents the server result for an individual mutation.
type PushMutationResult struct {
	MutationID   string                 `json:"mutationId"`
	Status       string                 `json:"status"` // accepted, conflict, denied
	Version      int64                  `json:"version,omitempty"`
	ErrorMessage string                 `json:"errorMessage,omitempty"`
	ServerEntity map[string]interface{} `json:"serverEntity,omitempty"`
}

// PushBatchRequest is the body of POST /sync/push.
type PushBatchRequest struct {
	Mutations []PushMutationRequest `json:"mutations"`
}

// PushBatchResponse is the response of POST /sync/push.
type PushBatchResponse struct {
	Results []PushMutationResult `json:"results"`
}

// FeedChange represents an entry in the user's sync change feed.
type FeedChange struct {
	Sequence  int64                  `json:"seq"`
	EntityID  string                 `json:"entityId"`
	Version   int64                  `json:"version"`
	Operation string                 `json:"operation"`
	Marker    string                 `json:"marker,omitempty"` // e.g. "ACCESS_REMOVED", "DELETED"
	Entity    map[string]interface{} `json:"entity,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// PullResponse is the response of GET /sync/pull.
type PullResponse struct {
	Changes    []FeedChange `json:"changes"`
	NextCursor string       `json:"nextCursor"`
	HasMore    bool         `json:"hasMore"`
}

// Invitation represents a project invitation.
type Invitation struct {
	ID              string    `json:"id"`
	ProjectID       string    `json:"projectId"`
	ProjectName     string    `json:"projectName"`
	NormalizedEmail string    `json:"normalizedEmail"`
	Role            string    `json:"role"`
	TokenHash       string    `json:"-"`
	ExpiresAt       time.Time `json:"expiresAt"`
	Status          string    `json:"status"` // PENDING, ACCEPTED, DECLINED, EXPIRED, CANCELLED
	CreatedByUID    string    `json:"createdByUid"`
	CreatedAt       time.Time `json:"createdAt"`
}
