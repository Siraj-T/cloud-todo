package notify_test

import (
	"testing"

	"github.com/Siraj-T/cloud-todo/desktop/internal/notify"
)

func TestNotificationPreferences(t *testing.T) {
	prefs := notify.DefaultPreferences()
	notifier := notify.NewNotifier(prefs)

	if !notifier.ShouldNotify(notify.CategoryDueDate) {
		t.Error("expected default CategoryDueDate to be enabled")
	}

	prefs.EnableDueDates = false
	notifier.UpdatePreferences(prefs)

	if notifier.ShouldNotify(notify.CategoryDueDate) {
		t.Error("expected CategoryDueDate to be disabled after update")
	}
	if !notifier.ShouldNotify(notify.CategoryInvitation) {
		t.Error("expected CategoryInvitation to remain enabled")
	}
}
