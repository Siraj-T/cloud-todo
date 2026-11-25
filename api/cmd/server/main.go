package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/Siraj-T/cloud-todo/api/internal/server"
	"github.com/Siraj-T/cloud-todo/api/internal/storage"
)

func loadEnv() {
	candidates := []string{".env", "api/.env", "../.env"}
	for _, path := range candidates {
		data, err := os.ReadFile(path)
		if err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					k := strings.TrimSpace(parts[0])
					v := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
					if os.Getenv(k) == "" {
						_ = os.Setenv(k, v)
					}
				}
			}
			break
		}
	}
}

func main() {
	loadEnv()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Persistent JSON-backed storage for local standalone deployment.
	// In production with Firestore, a FirestoreStorage adapter implements the Storage interface.
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	statePath := filepath.Join(homeDir, ".cloudtodo", "cloud-api-state.json")
	store := storage.NewPersistentMemoryStorage(statePath)
	srv := server.NewServer(store)

	httpServer := &http.Server{
		Addr:         ":" + port,
		Handler:      srv,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Cloud Todo Go Sync API listening on :%s", port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down API server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("Server forced shutdown: %v", err)
	}
	fmt.Println("Server exited cleanly.")
}

