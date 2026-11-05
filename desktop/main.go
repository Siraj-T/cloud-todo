package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/Siraj-T/cloud-todo/desktop/internal/notify"
	"github.com/Siraj-T/cloud-todo/desktop/internal/store"
	appSync "github.com/Siraj-T/cloud-todo/desktop/internal/sync"
)

//go:embed frontend/dist/*
var assets embed.FS

func main() {
	userHome, err := os.UserHomeDir()
	if err != nil {
		userHome = "."
	}
	appDir := filepath.Join(userHome, ".cloudtodo")
	_ = os.MkdirAll(appDir, 0700)
	dbPath := filepath.Join(appDir, "todo.db")

	// 1. Initialize SQLite Database & Schema Migrations
	db, err := store.Open(dbPath)
	if err != nil {
		log.Fatalf("Failed to open SQLite database: %v", err)
	}
	defer db.Close()

	// 2. Initialize Desktop Toast Notifier & Due Date Scheduler
	notifier := notify.NewNotifier(notify.DefaultPreferences())
	scheduler := notify.NewDueDateScheduler(db, notifier)

	// 3. Initialize Cloud Sync Client & Engine
	apiURL := os.Getenv("API_BASE_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8080"
	}
	client := appSync.NewClient(apiURL, "")
	engine := appSync.NewEngine(db, client, notifier, "siraj.altarhouni5@gmail.com")

	// 4. Initialize Desktop Bridge App
	app := NewApp(db, engine, notifier, "siraj.altarhouni5@gmail.com")
	ctx := context.Background()
	app.Startup(ctx)
	scheduler.Start(ctx, "siraj.altarhouni5@gmail.com")

	// 5. Serve Embedded Frontend Assets
	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		log.Fatalf("Failed to load embedded frontend assets: %v", err)
	}

	http.Handle("/", http.FileServer(http.FS(distFS)))

	port := os.Getenv("DESKTOP_PORT")
	if port == "" {
		port = "3456"
	}

	fmt.Printf("====================================================\n")
	fmt.Printf(" Cloud Todo Desktop Running at http://localhost:%s  \n", port)
	fmt.Printf(" SQLite Store: %s\n", dbPath)
	fmt.Printf(" Sync API Target: %s\n", apiURL)
	fmt.Printf("====================================================\n")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Desktop server stopped: %v", err)
	}
}

