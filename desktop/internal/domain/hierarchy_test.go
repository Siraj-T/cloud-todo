package domain_test

import (
	"strings"
	"testing"

	"github.com/Siraj-T/cloud-todo/desktop/internal/domain"
)

func TestHierarchyRules(t *testing.T) {
	t.Run("self-parenting rejected", func(t *testing.T) {
		taskID := "task-1"
		task := domain.Task{
			ID:       taskID,
			Title:    "Self-referencing",
			ParentID: &taskID,
		}
		err := domain.ValidateHierarchy(&task, nil)
		if err == nil || !strings.Contains(err.Error(), "self-parenting") {
			t.Fatalf("expected self-parenting error, got %v", err)
		}
	})

	t.Run("second nesting level rejected (parent is already a subtask)", func(t *testing.T) {
		grandParentID := "gp-1"
		parentID := "parent-1"
		parent := domain.Task{
			ID:       parentID,
			Title:    "Subtask parent",
			ParentID: &grandParentID, // Parent is already a subtask!
		}
		child := domain.Task{
			ID:       "child-1",
			Title:    "Sub-subtask",
			ParentID: &parentID,
		}
		err := domain.ValidateHierarchy(&child, &parent)
		if err == nil || !strings.Contains(err.Error(), "subtasks cannot contain subtasks") {
			t.Fatalf("expected subtask nesting error, got %v", err)
		}
	})

	t.Run("subtask inherits parent scope", func(t *testing.T) {
		projectID := "proj-learn-wails"
		parentID := "parent-1"
		parent := domain.Task{
			ID:        parentID,
			Title:     "Parent in project",
			ProjectID: &projectID,
		}
		child := domain.Task{
			ID:       "child-1",
			Title:    "Child task",
			ParentID: &parentID,
		}
		err := domain.ValidateHierarchy(&child, &parent)
		if err != nil {
			t.Fatalf("unexpected hierarchy validation error: %v", err)
		}
		if child.ProjectID == nil || *child.ProjectID != projectID {
			t.Errorf("child did not inherit parent project ID: got %v, want %v", child.ProjectID, projectID)
		}
	})

	t.Run("subtask detached becomes root in same scope", func(t *testing.T) {
		projectID := "proj-learn-wails"
		task := domain.Task{
			ID:        "sub-1",
			Title:     "Detached subtask",
			ParentID:  nil,
			ProjectID: &projectID,
		}
		err := domain.ValidateHierarchy(&task, nil)
		if err != nil {
			t.Fatalf("unexpected validation error on detached task: %v", err)
		}
		if task.ParentID != nil {
			t.Error("task ParentID should be nil")
		}
		if task.ProjectID == nil || *task.ProjectID != projectID {
			t.Errorf("expected task to retain project scope %v", projectID)
		}
	})
}
