package domain

import (
	"errors"
	"fmt"
)

// ValidateHierarchy verifies that subtask rules are satisfied:
// 1. A task cannot parent itself (no cycles).
// 2. Only a root task can have subtasks (max 1 nesting level; subtasks cannot contain subtasks).
// 3. Subtasks inherit their parent's scope (personal vs project).
// 4. Detaching a subtask makes it a root in the same scope.
func ValidateHierarchy(task *Task, parent *Task) error {
	if task.ParentID != nil && *task.ParentID != "" {
		// Rule 1: No self-parenting
		if task.ID != "" && *task.ParentID == task.ID {
			return errors.New("self-parenting is rejected: a task cannot be its own parent")
		}

		if parent != nil {
			// Rule 2: Parent cannot be a subtask itself
			if parent.ParentID != nil && *parent.ParentID != "" {
				return fmt.Errorf("subtasks cannot contain subtasks: parent %s is already a subtask", parent.ID)
			}

			// Rule 3: Subtask inherits parent's project scope
			task.ProjectID = parent.ProjectID
		}
	}

	return nil
}
