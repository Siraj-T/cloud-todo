package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Siraj-T/cloud-todo/api/internal/storage"
	"github.com/Siraj-T/cloud-todo/api/pkg/models"
)

type contextKey string

const (
	userContextKey contextKey = "userContext"
)

// UserContext holds verified authentication and session data.
type UserContext struct {
	UID           string
	Email         string
	EmailVerified bool
	SessionID     string
	DeviceName    string
}

// Server is the HTTP server for the Cloud Sync API.
type Server struct {
	storage    storage.Storage
	mux        *http.ServeMux
	sseClients map[string]chan string // sessionID -> channel
	sseMu      sync.RWMutex
}

// NewServer creates a new API server.
func NewServer(store storage.Storage) *Server {
	s := &Server{
		storage:    store,
		mux:        http.NewServeMux(),
		sseClients: make(map[string]chan string),
	}
	s.routes()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /healthz", s.handleHealthz)

	// Session enrollment (unauthenticated or with fresh token)
	s.mux.HandleFunc("POST /sessions/enroll", s.handleEnrollSession)

	// Authenticated routes
	s.mux.HandleFunc("GET /devices", s.requireAuth(s.handleListDevices))
	s.mux.HandleFunc("POST /devices/{id}/revoke", s.requireAuth(s.handleRevokeDevice))
	s.mux.HandleFunc("POST /devices/{id}/push-token", s.requireAuth(s.handleRegisterPushToken))

	s.mux.HandleFunc("POST /sync/push", s.requireAuth(s.handleSyncPush))
	s.mux.HandleFunc("GET /sync/pull", s.requireAuth(s.handleSyncPull))
	s.mux.HandleFunc("GET /events", s.requireAuth(s.handleSSEEvents))

	s.mux.HandleFunc("POST /projects/{id}/invitations", s.requireAuth(s.handleCreateInvitation))
	s.mux.HandleFunc("POST /invitations/{token}/accept", s.requireAuth(s.handleAcceptInvitation))
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

// Auth middleware: verifies Device Token and retrieves caller context.
func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deviceToken := r.Header.Get("X-Device-Token")
		if deviceToken == "" {
			http.Error(w, `{"error":"missing X-Device-Token"}`, http.StatusUnauthorized)
			return
		}

		tokenHash := storage.HashToken(deviceToken)
		session, err := s.storage.GetSessionByTokenHash(r.Context(), tokenHash)
		if err != nil {
			if err == storage.ErrSessionRevoked {
				http.Error(w, `{"error":"device session is revoked"}`, http.StatusUnauthorized)
				return
			}
			http.Error(w, `{"error":"invalid device token"}`, http.StatusUnauthorized)
			return
		}

		// Update last seen
		_ = s.storage.UpdateSessionLastSeen(r.Context(), session.SessionID)

		userCtx := UserContext{
			UID:           session.UID,
			Email:         r.Header.Get("X-User-Email"),
			EmailVerified: r.Header.Get("X-Email-Verified") == "true",
			SessionID:     session.SessionID,
			DeviceName:    session.DeviceName,
		}

		ctx := context.WithValue(r.Context(), userContextKey, userCtx)
		next(w, r.WithContext(ctx))
	}
}

func getUserContext(r *http.Request) UserContext {
	v := r.Context().Value(userContextKey)
	if v == nil {
		return UserContext{}
	}
	return v.(UserContext)
}

// POST /sessions/enroll
func (s *Server) handleEnrollSession(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UID        string `json:"uid"`
		DeviceName string `json:"deviceName"`
		Platform   string `json:"platform"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UID == "" {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	rawTokenBytes := make([]byte, 32)
	_, _ = rand.Read(rawTokenBytes)
	rawToken := hex.EncodeToString(rawTokenBytes)
	tokenHash := storage.HashToken(rawToken)

	sessionIDBytes := make([]byte, 16)
	_, _ = rand.Read(sessionIDBytes)
	sessionID := hex.EncodeToString(sessionIDBytes)

	session := &models.Session{
		SessionID:  sessionID,
		UID:        req.UID,
		DeviceName: req.DeviceName,
		Platform:   req.Platform,
		TokenHash:  tokenHash,
		CreatedAt:  time.Now().UTC(),
		LastSeenAt: time.Now().UTC(),
	}

	if err := s.storage.CreateSession(r.Context(), session); err != nil {
		http.Error(w, `{"error":"failed to create session"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"sessionId":   sessionID,
		"deviceToken": rawToken,
	})
}

// GET /devices
func (s *Server) handleListDevices(w http.ResponseWriter, r *http.Request) {
	u := getUserContext(r)
	sessions, err := s.storage.ListSessions(r.Context(), u.UID)
	if err != nil {
		http.Error(w, `{"error":"failed to list devices"}`, http.StatusInternalServerError)
		return
	}

	for i := range sessions {
		if sessions[i].SessionID == u.SessionID {
			sessions[i].IsCurrent = true
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(sessions)
}

// POST /devices/{id}/revoke
func (s *Server) handleRevokeDevice(w http.ResponseWriter, r *http.Request) {
	u := getUserContext(r)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, `{"error":"missing device id"}`, http.StatusBadRequest)
		return
	}
	targetID := parts[2]

	err := s.storage.RevokeSession(r.Context(), u.UID, targetID)
	if err != nil {
		http.Error(w, `{"error":"device not found"}`, http.StatusNotFound)
		return
	}

	// Broadcast SSE event to target session if connected
	s.broadcastSSE(targetID, `{"event":"SESSION_REVOKED"}`)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "revoked"})
}

// POST /devices/{id}/push-token
func (s *Server) handleRegisterPushToken(w http.ResponseWriter, r *http.Request) {
	u := getUserContext(r)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, `{"error":"missing device id"}`, http.StatusBadRequest)
		return
	}
	targetID := parts[2]

	var req struct {
		FCMToken string `json:"fcmToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FCMToken == "" {
		http.Error(w, `{"error":"fcmToken is required"}`, http.StatusBadRequest)
		return
	}

	_ = s.storage.UpdateSessionFCMToken(r.Context(), u.UID, targetID, req.FCMToken)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"registered"}`))
}

// POST /sync/push
func (s *Server) handleSyncPush(w http.ResponseWriter, r *http.Request) {
	u := getUserContext(r)

	var req models.PushBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request format"}`, http.StatusBadRequest)
		return
	}

	if len(req.Mutations) > 100 {
		http.Error(w, `{"error":"batch size exceeds limit of 100"}`, http.StatusBadRequest)
		return
	}

	results := make([]models.PushMutationResult, 0, len(req.Mutations))
	for _, mut := range req.Mutations {
		res, err := s.storage.ApplyTaskMutation(r.Context(), mut, u.UID)
		if err != nil {
			results = append(results, models.PushMutationResult{
				MutationID:   mut.MutationID,
				Status:       "denied",
				ErrorMessage: err.Error(),
			})
		} else {
			results = append(results, *res)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(models.PushBatchResponse{Results: results})
}

// GET /sync/pull
func (s *Server) handleSyncPull(w http.ResponseWriter, r *http.Request) {
	u := getUserContext(r)

	cursorStr := r.URL.Query().Get("cursor")
	var cursor int64
	if cursorStr != "" {
		c, _ := strconv.ParseInt(cursorStr, 10, 64)
		cursor = c
	}

	limit := 50
	changes, nextCursor, err := s.storage.GetFeedChanges(r.Context(), u.UID, cursor, limit)
	if err != nil {
		http.Error(w, `{"error":"failed to pull changes"}`, http.StatusInternalServerError)
		return
	}

	resp := models.PullResponse{
		Changes:    changes,
		NextCursor: strconv.FormatInt(nextCursor, 10),
		HasMore:    len(changes) >= limit,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// GET /events (Server-Sent Events)
func (s *Server) handleSSEEvents(w http.ResponseWriter, r *http.Request) {
	u := getUserContext(r)

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	msgChan := make(chan string, 10)
	s.sseMu.Lock()
	s.sseClients[u.SessionID] = msgChan
	s.sseMu.Unlock()

	defer func() {
		s.sseMu.Lock()
		delete(s.sseClients, u.SessionID)
		s.sseMu.Unlock()
		close(msgChan)
	}()

	// Initial handshake
	_, _ = fmt.Fprintf(w, "data: {\"event\":\"CONNECTED\",\"time\":\"%s\"}\n\n", time.Now().UTC().Format(time.RFC3339))
	flusher.Flush()

	for {
		select {
		case msg := <-msgChan:
			_, _ = fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func (s *Server) broadcastSSE(sessionID, message string) {
	s.sseMu.RLock()
	defer s.sseMu.RUnlock()
	if ch, ok := s.sseClients[sessionID]; ok {
		select {
		case ch <- message:
		default:
		}
	}
}

// POST /projects/{id}/invitations
func (s *Server) handleCreateInvitation(w http.ResponseWriter, r *http.Request) {
	u := getUserContext(r)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, `{"error":"missing project id"}`, http.StatusBadRequest)
		return
	}
	projectID := parts[2]

	var req struct {
		Email       string `json:"email"`
		Role        string `json:"role"`
		ProjectName string `json:"projectName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		http.Error(w, `{"error":"invalid invitation payload"}`, http.StatusBadRequest)
		return
	}

	tokenBytes := make([]byte, 24)
	_, _ = rand.Read(tokenBytes)
	rawToken := hex.EncodeToString(tokenBytes)
	tokenHash := storage.HashToken(rawToken)

	inv := &models.Invitation{
		ID:              fmt.Sprintf("inv-%d", time.Now().UnixNano()),
		ProjectID:       projectID,
		ProjectName:     req.ProjectName,
		NormalizedEmail: strings.ToLower(strings.TrimSpace(req.Email)),
		Role:            req.Role,
		TokenHash:       tokenHash,
		ExpiresAt:       time.Now().Add(7 * 24 * time.Hour), // 7-day expiration per spec
		Status:          "PENDING",
		CreatedByUID:    u.UID,
		CreatedAt:       time.Now().UTC(),
	}

	if err := s.storage.CreateInvitation(r.Context(), inv); err != nil {
		http.Error(w, `{"error":"failed to create invitation"}`, http.StatusInternalServerError)
		return
	}

	// // TODO(manual-setup): When BREVO_API_KEY is configured, dispatch automated email here.
	// For now, return copy-able invite token URL
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"invitationId": inv.ID,
		"token":        rawToken,
		"expiresAt":    inv.ExpiresAt,
		"inviteLink":   fmt.Sprintf("cloudtodo://invite/%s", rawToken),
	})
}

// POST /invitations/{token}/accept
func (s *Server) handleAcceptInvitation(w http.ResponseWriter, r *http.Request) {
	u := getUserContext(r)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, `{"error":"missing invitation token"}`, http.StatusBadRequest)
		return
	}
	rawToken := parts[2]
	tokenHash := storage.HashToken(rawToken)

	inv, err := s.storage.AcceptInvitation(r.Context(), tokenHash, u.UID, u.Email)
	if err != nil {
		if err == storage.ErrEmailMismatch {
			http.Error(w, `{"error":"invitation email does not match verified account email"}`, http.StatusForbidden)
			return
		}
		if err == storage.ErrExpired {
			http.Error(w, `{"error":"invitation has expired"}`, http.StatusGone)
			return
		}
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "accepted",
		"projectId": inv.ProjectID,
		"role":      inv.Role,
	})
}
