package storage

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
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
	SetUserEmail(ctx context.Context, uid, email string)
	RemoveMemberByEmail(ctx context.Context, projectID, email string) error
	SetProjectName(ctx context.Context, projectID, name string)
	ListUserProjects(ctx context.Context, uid string) []UserProject
}

// UserProject summarizes a user's active project membership.
type UserProject struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

// MemoryStorage implements Storage in-memory with optional JSON disk persistence.
type MemoryStorage struct {
	mu           sync.RWMutex
	stateFile    string
	sessions     map[string]*models.Session // sessionID -> session
	tokenToID    map[string]string          // tokenHash -> sessionID
	tasks        map[string]map[string]interface{}
	taskVersions map[string]int64
	taskOwners   map[string]string
	taskProjects map[string]string
	memberships  map[string]string          // "projectID:uid" -> role
	projectNames map[string]string          // projectID -> name
	userEmails   map[string]string          // uid -> normalized email
	invitations  map[string]*models.Invitation // tokenHash -> invitation
	userFeeds    map[string][]models.FeedChange // uid -> changes
	feedSequence int64
}

type persistedState struct {
	Sessions     map[string]*models.Session        `json:"sessions"`
	TokenToID    map[string]string                 `json:"tokenToID"`
	Tasks        map[string]map[string]interface{} `json:"tasks"`
	TaskVersions map[string]int64                  `json:"taskVersions"`
	TaskOwners   map[string]string                 `json:"taskOwners"`
	TaskProjects map[string]string                 `json:"taskProjects"`
	Memberships  map[string]string                 `json:"memberships"`
	ProjectNames map[string]string                 `json:"projectNames"`
	UserEmails   map[string]string                 `json:"userEmails"`
	Invitations  map[string]*models.Invitation     `json:"invitations"`
	UserFeeds    map[string][]models.FeedChange    `json:"userFeeds"`
	FeedSequence int64                             `json:"feedSequence"`
}

// NewMemoryStorage creates a thread-safe in-memory storage (used in unit tests).
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		sessions:     make(map[string]*models.Session),
		tokenToID:    make(map[string]string),
		tasks:        make(map[string]map[string]interface{}),
		taskVersions: make(map[string]int64),
		taskOwners:   make(map[string]string),
		taskProjects: make(map[string]string),
		memberships:  make(map[string]string),
		projectNames: make(map[string]string),
		userEmails:   make(map[string]string),
		invitations:  make(map[string]*models.Invitation),
		userFeeds:    make(map[string][]models.FeedChange),
	}
}

// NewPersistentMemoryStorage creates a MemoryStorage backed by a JSON file on disk.
func NewPersistentMemoryStorage(stateFile string) *MemoryStorage {
	m := NewMemoryStorage()
	m.stateFile = stateFile
	if data, err := os.ReadFile(stateFile); err == nil {
		var s persistedState
		if json.Unmarshal(data, &s) == nil {
			if s.Sessions != nil {
				m.sessions = s.Sessions
			}
			if s.TokenToID != nil {
				m.tokenToID = s.TokenToID
			}
			if s.Tasks != nil {
				m.tasks = s.Tasks
			}
			if s.TaskVersions != nil {
				m.taskVersions = s.TaskVersions
			}
			if s.TaskOwners != nil {
				m.taskOwners = s.TaskOwners
			}
			if s.TaskProjects != nil {
				m.taskProjects = s.TaskProjects
			}
			if s.Memberships != nil {
				m.memberships = s.Memberships
			}
			if s.ProjectNames != nil {
				m.projectNames = s.ProjectNames
			}
			if s.UserEmails != nil {
				m.userEmails = s.UserEmails
			}
			if s.Invitations != nil {
				m.invitations = s.Invitations
			}
			if s.UserFeeds != nil {
				m.userFeeds = s.UserFeeds
			}
			m.feedSequence = s.FeedSequence
		}
	}
	return m
}

func (m *MemoryStorage) saveLocked() {
	if m.stateFile == "" {
		return
	}
	_ = os.MkdirAll(filepath.Dir(m.stateFile), 0700)
	s := persistedState{
		Sessions:     m.sessions,
		TokenToID:    m.tokenToID,
		Tasks:        m.tasks,
		TaskVersions: m.taskVersions,
		TaskOwners:   m.taskOwners,
		TaskProjects: m.taskProjects,
		Memberships:  m.memberships,
		ProjectNames: m.projectNames,
		UserEmails:   m.userEmails,
		Invitations:  m.invitations,
		UserFeeds:    m.userFeeds,
		FeedSequence: m.feedSequence,
	}
	if b, err := json.Marshal(s); err == nil {
		_ = os.WriteFile(m.stateFile, b, 0600)
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
	m.saveLocked()
	return nil
}

func (m *MemoryStorage) RemoveMembership(ctx context.Context, projectID, uid string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := fmt.Sprintf("%s:%s", projectID, uid)
	delete(m.memberships, key)
	m.saveLocked()
	return nil
}

func (m *MemoryStorage) SetProjectName(ctx context.Context, projectID, name string) {
	if projectID == "" || name == "" {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.projectNames[projectID] = name
	m.saveLocked()
}

func (m *MemoryStorage) ListUserProjects(ctx context.Context, uid string) []UserProject {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var out []UserProject
	suffix := ":" + uid
	for key, role := range m.memberships {
		if strings.HasSuffix(key, suffix) && role != "" {
			projectID := strings.TrimSuffix(key, suffix)
			name := m.projectNames[projectID]
			if name == "" {
				name = projectID
			}
			out = append(out, UserProject{ID: projectID, Name: name, Role: role})
		}
	}
	return out
}

func (m *MemoryStorage) SetUserEmail(ctx context.Context, uid, email string) {
	if uid == "" || email == "" {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.userEmails[uid] = strings.ToLower(strings.TrimSpace(email))
}

func (m *MemoryStorage) RemoveMemberByEmail(ctx context.Context, projectID, email string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	norm := strings.ToLower(strings.TrimSpace(email))
	for uid, uEmail := range m.userEmails {
		if uEmail == norm {
			delete(m.memberships, fmt.Sprintf("%s:%s", projectID, uid))
		}
	}
	for _, inv := range m.invitations {
		if inv.ProjectID == projectID && inv.NormalizedEmail == norm && inv.Status == "PENDING" {
			inv.Status = "CANCELLED"
		}
	}
	m.saveLocked()
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

	// Version check for conflict detection (allow CREATE re-seed when server has no record yet)
	if currentVersion != mut.BaseVersion && !(mut.Operation == "CREATE" && currentVersion == 0) {
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

	m.saveLocked()
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
	if inv.ProjectName != "" {
		m.projectNames[inv.ProjectID] = inv.ProjectName
	}
	m.saveLocked()
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
	m.userEmails[uid] = strings.ToLower(strings.TrimSpace(verifiedEmail))
	if inv.ProjectName != "" {
		m.projectNames[inv.ProjectID] = inv.ProjectName
	}

	// Seed existing project tasks into the newly joined member's feed
	for taskID, pID := range m.taskProjects {
		if pID == inv.ProjectID {
			if taskPayload, ok := m.tasks[taskID]; ok {
				m.feedSequence++
				m.userFeeds[uid] = append(m.userFeeds[uid], models.FeedChange{
					Sequence:  m.feedSequence,
					EntityID:  taskID,
					Version:   m.taskVersions[taskID],
					Operation: "CREATE",
					Entity:    taskPayload,
					Timestamp: time.Now().UTC(),
				})
			}
		}
	}

	m.saveLocked()
	return inv, nil
}
