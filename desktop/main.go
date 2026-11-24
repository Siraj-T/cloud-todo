package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/Siraj-T/cloud-todo/desktop/internal/notify"
	"github.com/Siraj-T/cloud-todo/desktop/internal/store"
	appSync "github.com/Siraj-T/cloud-todo/desktop/internal/sync"
)

//go:embed frontend/dist/*
var assets embed.FS

// launchDesktopWindow opens a dedicated native desktop window (Application Mode)
// with no browser address bar, no tabs, and an isolated desktop profile.
func launchDesktopWindow(targetURL string, appDir string) {
	edgePath := `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
	chromePath := `C:\Program Files\Google\Chrome\Application\chrome.exe`

	dataDir := filepath.Join(appDir, "window-profile")
	_ = os.MkdirAll(dataDir, 0700)

	var cmd *exec.Cmd
	if _, err := os.Stat(edgePath); err == nil {
		cmd = exec.Command(edgePath,
			"--app="+targetURL,
			"--window-size=1280,840",
			"--user-data-dir="+dataDir,
			"--no-first-run",
			"--no-default-browser-check",
		)
	} else if _, err := os.Stat(chromePath); err == nil {
		cmd = exec.Command(chromePath,
			"--app="+targetURL,
			"--window-size=1280,840",
			"--user-data-dir="+dataDir,
			"--no-first-run",
			"--no-default-browser-check",
		)
	} else {
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", targetURL)
	}

	if err := cmd.Run(); err != nil {
		log.Printf("Desktop window exited: %v", err)
	}
}

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

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.FS(distFS)))

	port := os.Getenv("DESKTOP_PORT")
	if port == "" {
		port = "3456"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Desktop server stopped: %v", err)
		}
	}()

	fmt.Printf("====================================================\n")
	fmt.Printf(" Cloud Todo Native Desktop App Running on :%s      \n", port)
	fmt.Printf(" SQLite Store: %s\n", dbPath)
	fmt.Printf(" Sync API Target: %s\n", apiURL)
	fmt.Printf("====================================================\n")

	time.Sleep(150 * time.Millisecond)

	// Launch native desktop window (Application Mode)
	launchDesktopWindow(fmt.Sprintf("http://localhost:%s", port), appDir)

	// Graceful shutdown when desktop window closes
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdownCtx)
}

