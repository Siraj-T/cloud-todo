package sync

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Siraj-T/cloud-todo/api/pkg/models"
)

// Client handles communication with the Go Cloud Sync API over HTTPS.
type Client struct {
	baseURL     string
	deviceToken string
	httpClient  *http.Client
}

// NewClient creates a new API client.
func NewClient(baseURL, deviceToken string) *Client {
	return &Client{
		baseURL:     baseURL,
		deviceToken: deviceToken,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SetDeviceToken updates the active device token.
func (c *Client) SetDeviceToken(token string) {
	c.deviceToken = token
}

// EnrollSession exchanges user ID for an opaque device token.
func (c *Client) EnrollSession(ctx context.Context, uid, deviceName, platform string) (string, string, error) {
	payload, _ := json.Marshal(map[string]string{
		"uid":        uid,
		"deviceName": deviceName,
		"platform":   platform,
	})

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/sessions/enroll", bytes.NewReader(payload))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("enrollment failed with status %d", resp.StatusCode)
	}

	var res struct {
		SessionID   string `json:"sessionId"`
		DeviceToken string `json:"deviceToken"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", "", err
	}

	return res.SessionID, res.DeviceToken, nil
}

// PushMutations pushes a batch of mutations to the server.
func (c *Client) PushMutations(ctx context.Context, mutations []models.PushMutationRequest) (*models.PushBatchResponse, error) {
	payload, _ := json.Marshal(models.PushBatchRequest{Mutations: mutations})

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/sync/push", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-Token", c.deviceToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("session revoked or unauthorized (401)")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("push failed with status %d", resp.StatusCode)
	}

	var result models.PushBatchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// PullChanges pulls new changes since cursor.
func (c *Client) PullChanges(ctx context.Context, cursor string) (*models.PullResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/sync/pull?cursor=%s", c.baseURL, cursor), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Device-Token", c.deviceToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("pull failed with status %d", resp.StatusCode)
	}

	var result models.PullResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}
