package notify

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/Siraj-T/cloud-todo/desktop/internal/store"
)

// Notification Categories
const (
	CategoryDueDate     = "DUE_DATE"
	CategoryInvitation  = "INVITATION"
	CategoryTaskUpdate  = "TASK_UPDATE"
	CategorySyncConflict = "SYNC_CONFLICT"
)

// Preferences stores user notification toggles.
type Preferences struct {
	EnableDueDates      bool `json:"enableDueDates"`
	EnableInvitations   bool `json:"enableInvitations"`
	EnableTaskUpdates   bool `json:"enableTaskUpdates"`
	EnableSyncConflicts bool `json:"enableSyncConflicts"`
}

// DefaultPreferences returns enabled defaults.
func DefaultPreferences() Preferences {
	return Preferences{
		EnableDueDates:      true,
		EnableInvitations:   true,
		EnableTaskUpdates:   true,
		EnableSyncConflicts: true,
	}
}

// Notifier handles triggering native desktop notifications.
type Notifier struct {
	prefs Preferences
	mu    sync.RWMutex
	seen  map[string]time.Time // Deduplication cache: key -> notifiedAt
}

// NewNotifier creates a new desktop notifier.
func NewNotifier(prefs Preferences) *Notifier {
	return &Notifier{
		prefs: prefs,
		seen:  make(map[string]time.Time),
	}
}

// UpdatePreferences updates the notification settings.
func (n *Notifier) UpdatePreferences(prefs Preferences) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.prefs = prefs
}

// ShouldNotify checks if category is enabled.
func (n *Notifier) ShouldNotify(category string) bool {
	n.mu.RLock()
	defer n.mu.RUnlock()
	switch category {
	case CategoryDueDate:
		return n.prefs.EnableDueDates
	case CategoryInvitation:
		return n.prefs.EnableInvitations
	case CategoryTaskUpdate:
		return n.prefs.EnableTaskUpdates
	case CategorySyncConflict:
		return n.prefs.EnableSyncConflicts
	default:
		return true
	}
}

// ShowToast triggers a native Windows toast notification.
func (n *Notifier) ShowToast(title, message, category, dedupeKey string) error {
	if !n.ShouldNotify(category) {
		return nil
	}

	n.mu.Lock()
	if dedupeKey != "" {
		if last, exists := n.seen[dedupeKey]; exists {
			// Suppress duplicate within 1 hour
			if time.Since(last) < 1*time.Hour {
				n.mu.Unlock()
				return nil
			}
		}
		n.seen[dedupeKey] = time.Now()
	}
	n.mu.Unlock()

	// Escape strings for PowerShell script
	escapedTitle := strings.ReplaceAll(title, `"`, `\"`)
	escapedMsg := strings.ReplaceAll(message, `"`, `\"`)

	psScript := fmt.Sprintf(`
		[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
		$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
		$textNodes = $template.GetElementsByTagName("text")
		$textNodes.Item(0).AppendChild($template.CreateTextNode("%s")) > $null
		$textNodes.Item(1).AppendChild($template.CreateTextNode("%s")) > $null
		$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
		[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Cloud Todo").Show($toast)
	`, escapedTitle, escapedMsg)

	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", psScript)
	return cmd.Start() // Run asynchronously so it never blocks UI or sync loop
}

// DueDateScheduler periodically checks for tasks due today and alerts the user.
type DueDateScheduler struct {
	db       *store.DB
	notifier *Notifier
	stopChan chan struct{}
}

// NewDueDateScheduler creates a scheduler for due-date alerts.
func NewDueDateScheduler(db *store.DB, notifier *Notifier) *DueDateScheduler {
	return &DueDateScheduler{
		db:       db,
		notifier: notifier,
		stopChan: make(chan struct{}),
	}
}

// Start begins periodic checks (every 15 minutes, and immediately once upon start).
func (s *DueDateScheduler) Start(ctx context.Context, ownerUID string) {
	s.CheckDueTasks(ctx, ownerUID)

	ticker := time.NewTicker(15 * time.Minute)
	go func() {
		for {
			select {
			case <-ticker.C:
				s.CheckDueTasks(ctx, ownerUID)
			case <-s.stopChan:
				ticker.Stop()
				return
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}

// Stop stops the scheduler.
func (s *DueDateScheduler) Stop() {
	close(s.stopChan)
}

// CheckDueTasks queries tasks with due_date == today and completed == 0.
func (s *DueDateScheduler) CheckDueTasks(ctx context.Context, ownerUID string) {
	today := time.Now().Format("2006-01-02")
	tasks, err := s.db.ListTasks(ctx, store.TaskFilter{
		OwnerUID:         ownerUID,
		IncludeCompleted: false,
		IncludeDeleted:   false,
	})
	if err != nil {
		return
	}

	for _, task := range tasks {
		if task.DueDate != nil && *task.DueDate == today {
			dedupeKey := fmt.Sprintf("due-%s-%s", task.ID, today)
			_ = s.notifier.ShowToast(
				"Task Due Today",
				fmt.Sprintf("%s is scheduled for today", task.Title),
				CategoryDueDate,
				dedupeKey,
			)
		}
	}
}
