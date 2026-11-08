package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// Sender defines the contract for dispatching collaborative email invitations.
type Sender interface {
	SendInvitation(ctx context.Context, toEmail, projectName, inviterEmail, inviteLink string) error
}

// ResendSender sends emails via Resend's API or falls back gracefully to local logging.
type ResendSender struct {
	apiKey     string
	fromEmail  string
	httpClient *http.Client
}

// NewSender creates a new email sender initialized from environment variables.
func NewSender() Sender {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("RESEND_FROM")
	if fromEmail == "" {
		fromEmail = "Cloud Todo <onboarding@resend.dev>"
	}

	return &ResendSender{
		apiKey:    apiKey,
		fromEmail: fromEmail,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SendInvitation sends an invitation email. If no RESEND_API_KEY is configured,
// it gracefully logs the invite link to stdout without failing.
func (s *ResendSender) SendInvitation(ctx context.Context, toEmail, projectName, inviterEmail, inviteLink string) error {
	if s.apiKey == "" {
		log.Printf("[Emailer (Simulation)] RESEND_API_KEY not configured. To send real emails, set RESEND_API_KEY=re_... in environment.")
		log.Printf("[Emailer (Simulation)] Invite for %s to join '%s' by %s: %s", toEmail, projectName, inviterEmail, inviteLink)
		return nil
	}

	subject := fmt.Sprintf("You're invited to collaborate on '%s'", projectName)
	htmlContent := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #fbf6ec; border: 1px solid rgba(36,28,21,0.12); border-radius: 12px; color: #241c15;">
			<h2 style="font-family: Georgia, serif; color: #241c15; margin-top: 0;">Project Invitation</h2>
			<p style="font-size: 15px; line-height: 1.6; color: #544636;">
				<strong>%s</strong> has invited you to collaborate on <strong>%s</strong> in Cloud Todo.
			</p>
			<div style="margin: 32px 0;">
				<a href="%s" style="background-color: #c4703a; color: #fbf6ec; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 14px;">
					Accept Invitation
				</a>
			</div>
			<p style="font-size: 13px; color: #7a6248; line-height: 1.5;">
				This invitation link is valid for 7 days. If the button above does not work, copy and paste this link into your browser or app:<br/>
				<code style="word-break: break-all; background: rgba(36,28,21,0.06); padding: 4px 8px; border-radius: 4px; font-size: 12px;">%s</code>
			</p>
		</div>
	`, inviterEmail, projectName, inviteLink, inviteLink)

	payload := map[string]interface{}{
		"from":    s.fromEmail,
		"to":      []string{toEmail},
		"subject": subject,
		"html":    htmlContent,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal resend email payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create resend request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email via resend: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend api error (status %d): %s", resp.StatusCode, string(respBody))
	}

	log.Printf("[Emailer (Resend)] Invitation email successfully dispatched to %s for project '%s'", toEmail, projectName)
	return nil
}

