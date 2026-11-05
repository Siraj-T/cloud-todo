package server_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Siraj-T/cloud-todo/api/internal/server"
	"github.com/Siraj-T/cloud-todo/api/internal/storage"
	"github.com/Siraj-T/cloud-todo/api/pkg/models"
)

func setupTestServer() (*server.Server, *storage.MemoryStorage) {
	store := storage.NewMemoryStorage()
	srv := server.NewServer(store)
	return srv, store
}

func enrollDevice(t *testing.T, srv *server.Server, uid, name, platform string) (string, string) {
	t.Helper()
	body, _ := json.Marshal(map[string]string{
		"uid":        uid,
		"deviceName": name,
		"platform":   platform,
	})
	req := httptest.NewRequest("POST", "/sessions/enroll", bytes.NewReader(body))
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("enroll failed with status %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		SessionID   string `json:"sessionId"`
		DeviceToken string `json:"deviceToken"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	return resp.SessionID, resp.DeviceToken
}

func TestDeviceEnrollmentAndRevocation(t *testing.T) {
	srv, _ := setupTestServer()

	// 1. Enroll Laptop (Device A) and Phone (Device B) for user-1
	sessionA, tokenA := enrollDevice(t, srv, "user-1", "Laptop", "windows")
	_ = sessionA
	sessionB, tokenB := enrollDevice(t, srv, "user-1", "Phone", "android")

	// 2. Both devices can query /devices
	reqA := httptest.NewRequest("GET", "/devices", nil)
	reqA.Header.Set("X-Device-Token", tokenA)
	wA := httptest.NewRecorder()
	srv.ServeHTTP(wA, reqA)
	if wA.Code != http.StatusOK {
		t.Fatalf("Device A request failed: %d", wA.Code)
	}

	reqB := httptest.NewRequest("GET", "/devices", nil)
	reqB.Header.Set("X-Device-Token", tokenB)
	wB := httptest.NewRecorder()
	srv.ServeHTTP(wB, reqB)
	if wB.Code != http.StatusOK {
		t.Fatalf("Device B request failed: %d", wB.Code)
	}

	// 3. User on Device A revokes Device B
	revokeReq := httptest.NewRequest("POST", "/devices/"+sessionB+"/revoke", nil)
	revokeReq.Header.Set("X-Device-Token", tokenA)
	wRevoke := httptest.NewRecorder()
	srv.ServeHTTP(wRevoke, revokeReq)
	if wRevoke.Code != http.StatusOK {
		t.Fatalf("Revocation failed: %d", wRevoke.Code)
	}

	// 4. Device B's subsequent request is denied with 401 Unauthorized!
	reqB2 := httptest.NewRequest("GET", "/devices", nil)
	reqB2.Header.Set("X-Device-Token", tokenB)
	wB2 := httptest.NewRecorder()
	srv.ServeHTTP(wB2, reqB2)
	if wB2.Code != http.StatusUnauthorized {
		t.Fatalf("expected Device B to be rejected with 401, got %d", wB2.Code)
	}

	// 5. Device A remains fully authorized!
	reqA2 := httptest.NewRequest("GET", "/devices", nil)
	reqA2.Header.Set("X-Device-Token", tokenA)
	wA2 := httptest.NewRecorder()
	srv.ServeHTTP(wA2, reqA2)
	if wA2.Code != http.StatusOK {
		t.Fatalf("expected Device A to remain authorized, got %d", wA2.Code)
	}
}

func TestSyncPushPullAndConflict(t *testing.T) {
	srv, _ := setupTestServer()
	_, token := enrollDevice(t, srv, "user-sync", "Laptop", "windows")

	taskID := "task-cloud-1"

	// 1. First push: CREATE task with baseVersion 0 -> Should be accepted
	pushReq := models.PushBatchRequest{
		Mutations: []models.PushMutationRequest{
			{
				MutationID:  "mut-create-1",
				EntityID:    taskID,
				BaseVersion: 0,
				Operation:   "CREATE",
				Payload: map[string]interface{}{
					"id":    taskID,
					"title": "Cloud first task",
				},
			},
		},
	}
	body, _ := json.Marshal(pushReq)
	req := httptest.NewRequest("POST", "/sync/push", bytes.NewReader(body))
	req.Header.Set("X-Device-Token", token)
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("push failed: %d", w.Code)
	}
	var pushResp models.PushBatchResponse
	_ = json.Unmarshal(w.Body.Bytes(), &pushResp)
	if len(pushResp.Results) != 1 || pushResp.Results[0].Status != "accepted" {
		t.Fatalf("expected accepted mutation, got %v", pushResp.Results)
	}
	if pushResp.Results[0].Version != 1 {
		t.Errorf("expected version 1, got %d", pushResp.Results[0].Version)
	}

	// 2. Second push: UPDATE with stale baseVersion 0 -> Should trigger CONFLICT!
	stalePush := models.PushBatchRequest{
		Mutations: []models.PushMutationRequest{
			{
				MutationID:  "mut-stale-2",
				EntityID:    taskID,
				BaseVersion: 0, // Stale! Current is 1
				Operation:   "UPDATE",
				Payload: map[string]interface{}{
					"id":    taskID,
					"title": "Stale update",
				},
			},
		},
	}
	staleBody, _ := json.Marshal(stalePush)
	reqStale := httptest.NewRequest("POST", "/sync/push", bytes.NewReader(staleBody))
	reqStale.Header.Set("X-Device-Token", token)
	wStale := httptest.NewRecorder()
	srv.ServeHTTP(wStale, reqStale)

	var conflictResp models.PushBatchResponse
	_ = json.Unmarshal(wStale.Body.Bytes(), &conflictResp)
	if len(conflictResp.Results) != 1 || conflictResp.Results[0].Status != "conflict" {
		t.Fatalf("expected conflict result, got %v", conflictResp.Results)
	}
	if conflictResp.Results[0].ServerEntity == nil {
		t.Error("expected serverEntity in conflict response")
	}

	// 3. Pull changes -> Feed should contain the accepted mutation
	pullReq := httptest.NewRequest("GET", "/sync/pull?cursor=0", nil)
	pullReq.Header.Set("X-Device-Token", token)
	wPull := httptest.NewRecorder()
	srv.ServeHTTP(wPull, pullReq)

	var pullResp models.PullResponse
	_ = json.Unmarshal(wPull.Body.Bytes(), &pullResp)
	if len(pullResp.Changes) != 1 || pullResp.Changes[0].EntityID != taskID {
		t.Fatalf("expected 1 feed change for taskID %s, got %v", taskID, pullResp.Changes)
	}
}

func TestInvitationsAndRoleEnforcement(t *testing.T) {
	srv, store := setupTestServer()

	// Owner enrolls
	_, ownerToken := enrollDevice(t, srv, "owner-uid", "Owner PC", "windows")
	// Invitee enrolls
	_, inviteeToken := enrollDevice(t, srv, "invitee-uid", "Invitee PC", "windows")

	projectID := "proj-secret"
	_ = store.SetMembership(nil, projectID, "owner-uid", "owner")

	// 1. Owner creates invitation for invitee@example.com as viewer
	invBody, _ := json.Marshal(map[string]string{
		"email":       "invitee@example.com",
		"role":        "viewer",
		"projectName": "Secret Project",
	})
	invReq := httptest.NewRequest("POST", "/projects/"+projectID+"/invitations", bytes.NewReader(invBody))
	invReq.Header.Set("X-Device-Token", ownerToken)
	wInv := httptest.NewRecorder()
	srv.ServeHTTP(wInv, invReq)

	var invResp struct {
		Token string `json:"token"`
	}
	_ = json.Unmarshal(wInv.Body.Bytes(), &invResp)
	if invResp.Token == "" {
		t.Fatal("expected invite token")
	}

	// 2. Invitee attempts to accept with MISMATCHING email -> 403 Forbidden
	acceptReqBad := httptest.NewRequest("POST", "/invitations/"+invResp.Token+"/accept", nil)
	acceptReqBad.Header.Set("X-Device-Token", inviteeToken)
	acceptReqBad.Header.Set("X-User-Email", "wrong@example.com")
	wAcceptBad := httptest.NewRecorder()
	srv.ServeHTTP(wAcceptBad, acceptReqBad)
	if wAcceptBad.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for email mismatch, got %d", wAcceptBad.Code)
	}

	// 3. Invitee accepts with MATCHING verified email -> 200 OK
	acceptReqGood := httptest.NewRequest("POST", "/invitations/"+invResp.Token+"/accept", nil)
	acceptReqGood.Header.Set("X-Device-Token", inviteeToken)
	acceptReqGood.Header.Set("X-User-Email", "invitee@example.com")
	wAcceptGood := httptest.NewRecorder()
	srv.ServeHTTP(wAcceptGood, acceptReqGood)
	if wAcceptGood.Code != http.StatusOK {
		t.Fatalf("expected 200 for matching email, got %d: %s", wAcceptGood.Code, wAcceptGood.Body.String())
	}

	// 4. Viewer tries to mutate task in project -> Must be DENIED
	viewerMut := models.PushBatchRequest{
		Mutations: []models.PushMutationRequest{
			{
				MutationID:  "mut-viewer-write",
				EntityID:    "task-in-proj-1",
				BaseVersion: 0,
				Operation:   "CREATE",
				Payload: map[string]interface{}{
					"projectId": projectID,
					"title":     "Unauthorized task write",
				},
			},
		},
	}
	vBody, _ := json.Marshal(viewerMut)
	vReq := httptest.NewRequest("POST", "/sync/push", bytes.NewReader(vBody))
	vReq.Header.Set("X-Device-Token", inviteeToken)
	wV := httptest.NewRecorder()
	srv.ServeHTTP(wV, vReq)

	var vResp models.PushBatchResponse
	_ = json.Unmarshal(wV.Body.Bytes(), &vResp)
	if len(vResp.Results) != 1 || vResp.Results[0].Status != "denied" {
		t.Fatalf("expected viewer mutation to be denied, got %v", vResp.Results)
	}
}
