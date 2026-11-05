package storage

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/Siraj-T/cloud-todo/api/pkg/models"
)

var (
	ErrNotFound       = errors.New("not found")
	ErrSessionRevoked = errors.New("session is revoked")
	ErrUnauthorized   = errors.New("unauthorized")
	ErrConflict       = errors.New("version conflict")
	ErrExpired        = errors.New("invitation expired")
	ErrEmailMismatch  = errors.New("invitation email does not match verified email")
)

// Storage defines backend cloud persistence operations.
type Storage interface {
	CreateSession(ctx context.Context, session *models.Session) error
	GetSessionByTokenHash(ctx context.Context, tokenHash string) (*models.Session, error)
	ListSessions(ctx context.Context, uid string) ([]models.Session, error)
	RevokeSession(ctx context.Context, uid, sessionID string) error
	UpdateSessionLastSeen(ctx context.Context, sessionID string) error
	UpdateSessionFCMToken(ctx context.Context, uid, sessionID, fcmToken string) error

	ApplyTaskMutation(ctx context.Context, mut models.PushMutationRequest, callerUID string) (*models.PushMutationResult, error)
	GetFeedChanges(ctx context.Context, uid string, cursor int64, limit int) ([]models.FeedChange, int64, error)

	CreateInvitation(ctx context.Context, inv *models.Invitation) error
	GetInvitationByTokenHash(ctx context.Context, tokenHash string) (*models.Invitation, error)
	AcceptInvitation(ctx context.Context, tokenHash, uid, verifiedEmail string) (*models.Invitation, error)
	GetMembership(ctx context.Context, projectID, uid string) (string, error)
	SetMembership(ctx context.Context, projectID, uid, role string) error
	RemoveMembership(ctx context.Context, projectID, uid string) error
}

// MemoryStorage implements Storage in-memory with thread safety.
type MemoryStorage struct {
	mu           sync.RWMutex
	sessions     map[string]*models.Session // sessionID -> session
	tokenToID    map[string]string          // tokenHash -> sessionID
	tasks        map[string]map[string]interface{}
	taskVersions map[string]int64
	taskOwners   map[string]string
	taskProjects map[string]string
	memberships  map[string]string          // "projectID:uid" -> role
	invitations  map[string]*models.Invitation // tokenHash -> invitation
	userFeeds    map[string][]models.FeedChange // uid -> changes
	feedSequence int64
}

// NewMemoryStorage creates a thread-safe memory storage.
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		sessions:     make(map[string]*models.Session),
		tokenToID:    make(map[string]string),
		tasks:        make(map[string]map[string]interface{}),
		taskVersions: make(map[string]int64),
		taskOwners:   make(map[string]string),
		taskProjects: make(map[string]string),
		memberships:  make(map[string]string),
		invitations:  make(map[string]*models.Invitation),
		userFeeds:    make(map[string][]models.FeedChange),
	}
}

// HashToken computes a SHA-256 hex hash for a token.
func HashToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

func (m *MemoryStorage) CreateSession(ctx context.Context, session *models.Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.sessions[session.SessionID] = session
	m.tokenToID[session.TokenHash] = session.SessionID
	return nil
}

func (m *MemoryStorage) GetSessionByTokenHash(ctx context.Context, tokenHash string) (*models.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	id, exists := m.tokenToID[tokenHash]
	if !exists {
		return nil, ErrNotFound
	}
	s := m.sessions[id]
	if s == nil {
		return nil, ErrNotFound
	}
	if s.RevokedAt != nil {
		return s, ErrSessionRevoked
	}
	return s, nil
}

func (m *MemoryStorage) ListSessions(ctx context.Context, uid string) ([]models.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var result []models.Session
	for _, s := range m.sessions {
		if s.UID == uid {
			result = append(result, *s)
		}
	}
	return result, nil
}

func (m *MemoryStorage) RevokeSession(ctx context.Context, uid, sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	s, exists := m.sessions[sessionID]
	if !exists || s.UID != uid {
		return ErrNotFound
	}
	now := time.Now().UTC()
	s.RevokedAt = &now
	return nil
}

func (m *MemoryStorage) UpdateSessionLastSeen(ctx context.Context, sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if s, exists := m.sessions[sessionID]; exists {
		s.LastSeenAt = time.Now().UTC()
	}
	return nil
}

func (m *MemoryStorage) UpdateSessionFCMToken(ctx context.Context, uid, sessionID, fcmToken string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	s, exists := m.sessions[sessionID]
	if !exists || s.UID != uid {
		return ErrNotFound
	}
	s.FCMToken = &fcmToken
	return nil
}

func (m *MemoryStorage) GetMembership(ctx context.Context, projectID, uid string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	key := fmt.Sprintf("%s:%s", projectID, uid)
	role, exists := m.memberships[key]
	if !exists {
		return "", ErrNotFound
	}
	return role, nil
}

func (m *MemoryStorage) SetMembership(ctx context.Context, projectID, uid, role string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := fmt.Sprintf("%s:%s", projectID, uid)
	m.memberships[key] = role
	return nil
}

func (m *MemoryStorage) RemoveMembership(ctx context.Context, projectID, uid string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := fmt.Sprintf("%s:%s", projectID, uid)
	delete(m.memberships, key)
	return nil
}

func (m *MemoryStorage) ApplyTaskMutation(ctx context.Context, mut models.PushMutationRequest, callerUID string) (*models.PushMutationResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	entityID := mut.EntityID
	var projectID string
	if p, ok := mut.Payload["projectId"].(string); ok && p != "" {
		projectID = p
	}

	// Permission verification:
	// If project task, verify caller is owner or editor
	if projectID != "" {
		key := fmt.Sprintf("%s:%s", projectID, callerUID)
		role, exists := m.memberships[key]
		if !exists || (role != "owner" && role != "editor") {
			return &models.PushMutationResult{
				MutationID:   mut.MutationID,
				Status:       "denied",
				ErrorMessage: "write access denied: viewer role or not a project member",
			}, nil
		}
	}

	currentVersion := m.taskVersions[entityID]

	// Version check for conflict detection
	if currentVersion != mut.BaseVersion {
		serverEntity := m.tasks[entityID]
		return &models.PushMutationResult{
			MutationID:   mut.MutationID,
			Status:       "conflict",
			Version:      currentVersion,
			ServerEntity: serverEntity,
			ErrorMessage: fmt.Sprintf("version mismatch: expected %d, current is %d", mut.BaseVersion, currentVersion),
		}, nil
	}

	newVersion := currentVersion + 1
	m.taskVersions[entityID] = newVersion

	now := time.Now().UTC()
	mut.Payload["version"] = newVersion
	mut.Payload["updatedAt"] = now.Format(time.RFC3339)

	if mut.Operation == "CREATE" || mut.Operation == "UPDATE" {
		m.tasks[entityID] = mut.Payload
		m.taskOwners[entityID] = callerUID
		if projectID != "" {
			m.taskProjects[entityID] = projectID
		}
	} else if mut.Operation == "DELETE" {
		delete(m.tasks, entityID)
	}

	// Fan out to user change feed
	m.feedSequence++
	change := models.FeedChange{
		Sequence:  m.feedSequence,
		EntityID:  entityID,
		Version:   newVersion,
		Operation: mut.Operation,
		Entity:    mut.Payload,
		Timestamp: now,
	}

	// Add to caller's feed and project members' feeds
	m.userFeeds[callerUID] = append(m.userFeeds[callerUID], change)

	if projectID != "" {
		for key, role := range m.memberships {
			if strings.HasPrefix(key, projectID+":") && role != "" {
				parts := strings.Split(key, ":")
				memberUID := parts[1]
				if memberUID != callerUID {
					m.userFeeds[memberUID] = append(m.userFeeds[memberUID], change)
				}
			}
		}
	}

	return &models.PushMutationResult{
		MutationID: mut.MutationID,
		Status:     "accepted",
		Version:    newVersion,
	}, nil
}

func (m *MemoryStorage) GetFeedChanges(ctx context.Context, uid string, cursor int64, limit int) ([]models.FeedChange, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	feed := m.userFeeds[uid]
	var results []models.FeedChange
	var nextCursor = cursor

	for _, c := range feed {
		if c.Sequence > cursor {
			results = append(results, c)
			nextCursor = c.Sequence
			if limit > 0 && len(results) >= limit {
				break
			}
		}
	}

	return results, nextCursor, nil
}

func (m *MemoryStorage) CreateInvitation(ctx context.Context, inv *models.Invitation) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.invitations[inv.TokenHash] = inv
	return nil
}

func (m *MemoryStorage) GetInvitationByTokenHash(ctx context.Context, tokenHash string) (*models.Invitation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	inv, exists := m.invitations[tokenHash]
	if !exists {
		return nil, ErrNotFound
	}
	return inv, nil
}

func (m *MemoryStorage) AcceptInvitation(ctx context.Context, tokenHash, uid, verifiedEmail string) (*models.Invitation, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	inv, exists := m.invitations[tokenHash]
	if !exists {
		return nil, ErrNotFound
	}

	if inv.Status != "PENDING" {
		return nil, fmt.Errorf("invitation already %s", strings.ToLower(inv.Status))
	}

	if time.Now().After(inv.ExpiresAt) {
		inv.Status = "EXPIRED"
		return nil, ErrExpired
	}

	// Strictly verify matching email
	if strings.ToLower(inv.NormalizedEmail) != strings.ToLower(verifiedEmail) {
		return nil, ErrEmailMismatch
	}

	inv.Status = "ACCEPTED"
	m.memberships[fmt.Sprintf("%s:%s", inv.ProjectID, uid)] = inv.Role

	return inv, nil
}
