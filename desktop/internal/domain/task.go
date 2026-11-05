package domain

import (
	"time"
)

// Task represents a todo item, either global or within a project.
// One subtask level is supported (ParentID != nil).
type Task struct {
	ID          string     `json:"id"`
	OwnerUID    string     `json:"ownerUid"`
	ProjectID   *string    `json:"projectId,omitempty"`
	ParentID    *string    `json:"parentId,omitempty"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	DueDate     *string    `json:"dueDate,omitempty"` // YYYY-MM-DD calendar date
	Tags        []string   `json:"tags"`
	Completed   bool       `json:"completed"`
	Version     int64      `json:"version"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

// Project represents a collection of tasks with role-based access.
type Project struct {
	ID        string     `json:"id"`
	OwnerUID  string     `json:"ownerUid"`
	Name      string     `json:"name"`
	Version   int64      `json:"version"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
}

// Project roles
const (
	RoleOwner  = "owner"
	RoleEditor = "editor"
	RoleViewer = "viewer"
)

// Membership defines a user's role in a project.
type Membership struct {
	ProjectID string    `json:"projectId"`
	UID       string    `json:"uid"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

// CanMutateTasks returns true if the role permits creating, editing, or deleting tasks.
func CanMutateTasks(role string) bool {
	return role == RoleOwner || role == RoleEditor
}

// CanManageProject returns true if the role permits managing members and deleting the project.
func CanManageProject(role string) bool {
	return role == RoleOwner
}

