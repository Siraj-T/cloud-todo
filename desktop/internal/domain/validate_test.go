package domain_test

import (
	"strings"
	"testing"

	"github.com/Siraj-T/cloud-todo/desktop/internal/domain"
)

func TestValidateTask(t *testing.T) {
	validDate := "2026-11-10"
	invalidDate := "2026/11/10"
	nonExistentDate := "2026-02-30"

	tests := []struct {
		name    string
		task    domain.Task
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid minimal task",
			task: domain.Task{
				Title: "Buy groceries",
			},
			wantErr: false,
		},
		{
			name: "empty title rejected",
			task: domain.Task{
				Title: "   ",
			},
			wantErr: true,
			errMsg:  "title cannot be empty",
		},
		{
			name: "title over 200 chars rejected",
			task: domain.Task{
				Title: strings.Repeat("a", 201),
			},
			wantErr: true,
			errMsg:  "title cannot exceed 200 characters",
		},
		{
			name: "description over 10000 chars rejected",
			task: domain.Task{
				Title:       "Valid title",
				Description: strings.Repeat("a", 10001),
			},
			wantErr: true,
			errMsg:  "description cannot exceed 10000 characters",
		},
		{
			name: "more than 20 tags rejected",
			task: domain.Task{
				Title: "Valid",
				Tags: func() []string {
					tags := make([]string, 21)
					for i := range tags {
						tags[i] = "tag" + string(rune('a'+i))
					}
					return tags
				}(),
			},
			wantErr: true,
			errMsg:  "cannot have more than 20 tags",
		},
		{
			name: "tag over 30 chars rejected",
			task: domain.Task{
				Title: "Valid",
				Tags:  []string{strings.Repeat("t", 31)},
			},
			wantErr: true,
			errMsg:  "tag cannot exceed 30 characters",
		},
		{
			name: "valid due date",
			task: domain.Task{
				Title:   "Valid",
				DueDate: &validDate,
			},
			wantErr: false,
		},
		{
			name: "invalid due date format rejected",
			task: domain.Task{
				Title:   "Valid",
				DueDate: &invalidDate,
			},
			wantErr: true,
			errMsg:  "due date must be in YYYY-MM-DD format",
		},
		{
			name: "non-existent calendar date rejected",
			task: domain.Task{
				Title:   "Valid",
				DueDate: &nonExistentDate,
			},
			wantErr: true,
			errMsg:  "due date must be a valid calendar date",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := domain.ValidateTask(&tt.task)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ValidateTask() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil && tt.errMsg != "" && !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("ValidateTask() error = %v, expected to contain %q", err, tt.errMsg)
			}
		})
	}
}

func TestNormalizeTags(t *testing.T) {
	input := []string{"  Go  ", "go", "SQLITE", "sqlite", "React"}
	expected := []string{"go", "sqlite", "react"}

	task := domain.Task{
		Title: "Tag test",
		Tags:  input,
	}
	if err := domain.ValidateTask(&task); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}

	if len(task.Tags) != len(expected) {
		t.Fatalf("expected %d tags, got %d: %v", len(expected), len(task.Tags), task.Tags)
	}
	for i, tag := range task.Tags {
		if tag != expected[i] {
			t.Errorf("tag %d: got %s, want %s", i, tag, expected[i])
		}
	}
}

func TestValidateProjectName(t *testing.T) {
	if err := domain.ValidateProjectName("  "); err == nil {
		t.Error("expected error for empty project name, got nil")
	}
	if err := domain.ValidateProjectName(strings.Repeat("x", 101)); err == nil {
		t.Error("expected error for project name > 100 chars, got nil")
	}
	if err := domain.ValidateProjectName("Learn Wails"); err != nil {
		t.Errorf("unexpected error for valid project name: %v", err)
	}
}
