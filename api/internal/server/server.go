package server

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Siraj-T/cloud-todo/api/internal/email"
	"github.com/Siraj-T/cloud-todo/api/internal/storage"
	"github.com/Siraj-T/cloud-todo/api/pkg/models"
)

const (
	userContextKey = "userContext"
)

// UserContext holds verified authentication and session data.
type UserContext struct {
	UID           string
	Email         string
	EmailVerified bool
	SessionID     string
	DeviceName    string
}

// Server is the Gin-powered HTTP server for the Cloud Sync API.
type Server struct {
	storage    storage.Storage
	emailer    email.Sender
	router     *gin.Engine
	sseClients map[string]chan string // sessionID -> channel
	sseMu      sync.RWMutex
}

// NewServer creates a new API server with default emailer.
func NewServer(store storage.Storage) *Server {
	return NewServerWithEmailer(store, email.NewSender())
}

// NewServerWithEmailer creates a new API server with an explicit email sender.
func NewServerWithEmailer(store storage.Storage, emailer email.Sender) *Server {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Device-Token, X-User-Email, X-Email-Verified")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	s := &Server{
		storage:    store,
		emailer:    emailer,
		router:     router,
		sseClients: make(map[string]chan string),
	}

	s.routes()
	return s
}

// ServeHTTP delegates to the internal Gin engine, preserving standard http.Handler compatibility.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}

func (s *Server) routes() {
	s.router.GET("/healthz", s.handleHealthz)
	s.router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service":    "Cloud Todo Sync API",
			"status":     "healthy",
			"desktop_ui": "http://localhost:3456",
		})
	})

	// Session enrollment (unauthenticated)
	s.router.POST("/sessions/enroll", s.handleEnrollSession)

	// Authenticated routes group
	auth := s.router.Group("/")
	auth.Use(s.requireAuth())
	{
		auth.GET("/devices", s.handleListDevices)
		auth.POST("/devices/:id/revoke", s.handleRevokeDevice)
		auth.POST("/devices/:id/push-token", s.handleRegisterPushToken)

		auth.POST("/sync/push", s.handleSyncPush)
		auth.GET("/sync/pull", s.handleSyncPull)
		auth.GET("/events", s.handleSSEEvents)

		auth.POST("/projects", s.handleCreateProject)
		auth.POST("/projects/:id/invitations", s.handleCreateInvitation)
		auth.POST("/projects/:id/members/remove", s.handleRemoveMember)
		auth.POST("/invitations/:token/accept", s.handleAcceptInvitation)
	}
}

func (s *Server) handleHealthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// requireAuth middleware verifies Device Token and retrieves session context.
func (s *Server) requireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceToken := c.GetHeader("X-Device-Token")
		if deviceToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing X-Device-Token"})
			return
		}

		tokenHash := storage.HashToken(deviceToken)
		session, err := s.storage.GetSessionByTokenHash(c.Request.Context(), tokenHash)
		if err != nil {
			if err == storage.ErrSessionRevoked {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "device session is revoked"})
				return
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid device token"})
			return
		}

		// Update last seen asynchronously
		_ = s.storage.UpdateSessionLastSeen(c.Request.Context(), session.SessionID)

		userCtx := UserContext{
			UID:           session.UID,
			Email:         c.GetHeader("X-User-Email"),
			EmailVerified: c.GetHeader("X-Email-Verified") == "true",
			SessionID:     session.SessionID,
			DeviceName:    session.DeviceName,
		}

		if userCtx.Email != "" {
			s.storage.SetUserEmail(c.Request.Context(), userCtx.UID, userCtx.Email)
		}

		c.Set(userContextKey, userCtx)
		c.Next()
	}
}

func getUserContext(c *gin.Context) UserContext {
	v, exists := c.Get(userContextKey)
	if !exists {
		return UserContext{}
	}
	return v.(UserContext)
}

// POST /sessions/enroll
func (s *Server) handleEnrollSession(c *gin.Context) {
	var req struct {
		UID        string `json:"uid"`
		DeviceName string `json:"deviceName"`
		Platform   string `json:"platform"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.UID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
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

	if err := s.storage.CreateSession(c.Request.Context(), session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessionId":   sessionID,
		"deviceToken": rawToken,
	})
}

// GET /devices
func (s *Server) handleListDevices(c *gin.Context) {
	u := getUserContext(c)
	sessions, err := s.storage.ListSessions(c.Request.Context(), u.UID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list devices"})
		return
	}

	for i := range sessions {
		if sessions[i].SessionID == u.SessionID {
			sessions[i].IsCurrent = true
		}
	}

	c.JSON(http.StatusOK, sessions)
}

// POST /devices/:id/revoke
func (s *Server) handleRevokeDevice(c *gin.Context) {
	u := getUserContext(c)
	targetID := c.Param("id")
	if targetID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing device id"})
		return
	}

	err := s.storage.RevokeSession(c.Request.Context(), u.UID, targetID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
		return
	}

	// Broadcast SSE event to target session if currently connected
	s.broadcastSSE(targetID, `{"event":"SESSION_REVOKED"}`)

	c.JSON(http.StatusOK, gin.H{"status": "revoked"})
}

// POST /devices/:id/push-token
func (s *Server) handleRegisterPushToken(c *gin.Context) {
	u := getUserContext(c)
	targetID := c.Param("id")
	if targetID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing device id"})
		return
	}

	var req struct {
		FCMToken string `json:"fcmToken"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.FCMToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fcmToken is required"})
		return
	}

	_ = s.storage.UpdateSessionFCMToken(c.Request.Context(), u.UID, targetID, req.FCMToken)
	c.JSON(http.StatusOK, gin.H{"status": "registered"})
}

// POST /sync/push
func (s *Server) handleSyncPush(c *gin.Context) {
	u := getUserContext(c)

	var req models.PushBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format"})
		return
	}

	if len(req.Mutations) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "batch size exceeds limit of 100"})
		return
	}

	results := make([]models.PushMutationResult, 0, len(req.Mutations))
	for _, mut := range req.Mutations {
		res, err := s.storage.ApplyTaskMutation(c.Request.Context(), mut, u.UID)
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

	c.JSON(http.StatusOK, models.PushBatchResponse{Results: results})
}

// GET /sync/pull
func (s *Server) handleSyncPull(c *gin.Context) {
	u := getUserContext(c)

	cursorStr := c.Query("cursor")
	var cursor int64
	if cursorStr != "" {
		cInt, _ := strconv.ParseInt(cursorStr, 10, 64)
		cursor = cInt
	}

	limit := 50
	changes, nextCursor, err := s.storage.GetFeedChanges(c.Request.Context(), u.UID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to pull changes"})
		return
	}

	resp := models.PullResponse{
		Changes:    changes,
		NextCursor: strconv.FormatInt(nextCursor, 10),
		HasMore:    len(changes) >= limit,
	}

	c.JSON(http.StatusOK, resp)
}

// GET /events (Server-Sent Events)
func (s *Server) handleSSEEvents(c *gin.Context) {
	u := getUserContext(c)

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

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

	// Initial connected handshake
	c.Stream(func(w io.Writer) bool {
		_, _ = fmt.Fprintf(w, "data: {\"event\":\"CONNECTED\",\"time\":\"%s\"}\n\n", time.Now().UTC().Format(time.RFC3339))
		return false
	})

	c.Stream(func(w io.Writer) bool {
		select {
		case msg, ok := <-msgChan:
			if !ok {
				return false
			}
			_, _ = fmt.Fprintf(w, "data: %s\n\n", msg)
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
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

// POST /projects
func (s *Server) handleCreateProject(c *gin.Context) {
	u := getUserContext(c)
	var req struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project payload"})
		return
	}
	_ = s.storage.SetMembership(c.Request.Context(), req.ID, u.UID, "owner")
	c.JSON(http.StatusOK, gin.H{"id": req.ID, "name": req.Name, "role": "owner"})
}

// POST /projects/:id/members/remove
func (s *Server) handleRemoveMember(c *gin.Context) {
	u := getUserContext(c)
	projectID := c.Param("id")
	role, err := s.storage.GetMembership(c.Request.Context(), projectID, u.UID)
	if err != nil || role != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only project owners can remove members"})
		return
	}

	var req struct {
		UID   string `json:"uid"`
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || (req.UID == "" && req.Email == "") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing member uid or email"})
		return
	}
	if req.UID == u.UID || (req.Email != "" && strings.EqualFold(req.Email, u.Email)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project owner cannot remove themselves"})
		return
	}

	if req.UID != "" {
		_ = s.storage.RemoveMembership(c.Request.Context(), projectID, req.UID)
	}
	if req.Email != "" {
		_ = s.storage.RemoveMemberByEmail(c.Request.Context(), projectID, req.Email)
	}
	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

// POST /projects/:id/invitations
func (s *Server) handleCreateInvitation(c *gin.Context) {
	u := getUserContext(c)
	projectID := c.Param("id")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing project id"})
		return
	}

	var req struct {
		Email       string `json:"email"`
		Role        string `json:"role"`
		ProjectName string `json:"projectName"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invitation payload"})
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
		ExpiresAt:       time.Now().Add(7 * 24 * time.Hour), // 7-day expiration per specification
		Status:          "PENDING",
		CreatedByUID:    u.UID,
		CreatedAt:       time.Now().UTC(),
	}

	if err := s.storage.CreateInvitation(c.Request.Context(), inv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create invitation"})
		return
	}

	inviteLink := fmt.Sprintf("cloudtodo://invite/%s", rawToken)

	// Dispatch email invitation via Resend
	projectName := req.ProjectName
	if projectName == "" {
		projectName = "Project " + projectID
	}
	_ = s.emailer.SendInvitation(c.Request.Context(), inv.NormalizedEmail, projectName, u.Email, inviteLink)

	c.JSON(http.StatusOK, gin.H{
		"invitationId": inv.ID,
		"token":        rawToken,
		"expiresAt":    inv.ExpiresAt,
		"inviteLink":   inviteLink,
	})
}

// POST /invitations/:token/accept
func (s *Server) handleAcceptInvitation(c *gin.Context) {
	u := getUserContext(c)
	rawToken := c.Param("token")
	if rawToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing invitation token"})
		return
	}
	tokenHash := storage.HashToken(rawToken)

	inv, err := s.storage.AcceptInvitation(c.Request.Context(), tokenHash, u.UID, u.Email)
	if err != nil {
		if err == storage.ErrEmailMismatch {
			c.JSON(http.StatusForbidden, gin.H{"error": "invitation email does not match verified account email"})
			return
		}
		if err == storage.ErrExpired {
			c.JSON(http.StatusGone, gin.H{"error": "invitation has expired"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      "accepted",
		"projectId":   inv.ProjectID,
		"projectName": inv.ProjectName,
		"role":        inv.Role,
	})
}
