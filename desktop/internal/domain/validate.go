package domain

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// ValidateTask enforces the product limits and normalizes fields:
// - Title: trimmed, not empty, <= 200 characters
// - Description: <= 10,000 characters
// - Tags: <= 20 tags, each <= 30 characters, deduplicated case-insensitively
// - DueDate: YYYY-MM-DD calendar date without timezone
func ValidateTask(t *Task) error {
	t.Title = strings.TrimSpace(t.Title)
	if t.Title == "" {
		return errors.New("title cannot be empty")
	}
	if len(t.Title) > 200 {
		return errors.New("title cannot exceed 200 characters")
	}

	if len(t.Description) > 10000 {
		return errors.New("description cannot exceed 10000 characters")
	}

	// Normalize & validate tags
	if len(t.Tags) > 0 {
		seen := make(map[string]bool)
		normalized := make([]string, 0, len(t.Tags))

		for _, raw := range t.Tags {
			tag := strings.TrimSpace(raw)
			if tag == "" {
				continue
			}
			if len(tag) > 30 {
				return fmt.Errorf("tag cannot exceed 30 characters: %q", tag)
			}
			lower := strings.ToLower(tag)
			if !seen[lower] {
				seen[lower] = true
				normalized = append(normalized, lower)
			}
		}

		if len(normalized) > 20 {
			return errors.New("cannot have more than 20 tags")
		}
		t.Tags = normalized
	} else if t.Tags == nil {
		t.Tags = []string{}
	}

	// Validate due date if provided
	if t.DueDate != nil && *t.DueDate != "" {
		trimmedDate := strings.TrimSpace(*t.DueDate)
		if !dateRegex.MatchString(trimmedDate) {
			return errors.New("due date must be in YYYY-MM-DD format")
		}
		_, err := time.Parse("2006-01-02", trimmedDate)
		if err != nil {
			return errors.New("due date must be a valid calendar date")
		}
		t.DueDate = &trimmedDate
	}

	return nil
}

// ValidateProjectName validates the name of a project.
func ValidateProjectName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return errors.New("project name cannot be empty")
	}
	if len(trimmed) > 100 {
		return errors.New("project name cannot exceed 100 characters")
	}
	return nil
}
