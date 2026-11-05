# Cloud Todo — Manual Setup & Deployment Guide

This document tracks all external cloud service configurations that require manual console actions.

---

## 1. Firebase Project & Firestore (Completed ✓)

- **Firebase Project ID**: `cloud-todo-app-928`
- **Owner Account**: `siraj.altarhouni5@gmail.com`
- **Web App ID**: `1:797424987905:web:0c1165414969ea38747500`
- **Firestore Rules**: Strict deny-all rules deployed (`firestore.rules`). Direct client access is disabled per specification; all requests must pass through the authenticated Go Sync API using the Firebase Admin SDK.

---

## 2. Deferred Manual Setup Items

### A. Google OAuth Sign-in (Optional)
To enable the "Continue with Google" button:
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials?project=cloud-todo-app-928).
2. Configure **OAuth Consent Screen**:
   - User Type: External
   - App Name: `Cloud Todo`
   - User Support Email: `siraj.altarhouni5@gmail.com`
   - Test Users: Add `siraj.altarhouni5@gmail.com`
3. Click **Create Credentials** → **OAuth Client ID**:
   - Application Type: **Desktop app**
   - Name: `Cloud Todo Desktop`
4. Copy the Client ID into `.env`:
   ```bash
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   ```

### B. Automated Email Delivery (Brevo) (Optional)
By default, project invitations generate a secure 7-day invite link (`cloudtodo://invite/<token>`) that can be copied with one click. To send automated invite emails:
1. Create a free account at [Brevo (formerly Sendinblue)](https://www.brevo.com/).
2. Generate an API Key under **SMTP & API Keys**.
3. Set the environment variable on the Go API server:
   ```bash
   BREVO_API_KEY="xkeysib-..."
   BREVO_SENDER_EMAIL="notifications@yourdomain.com"
   ```

### C. Cloud Run / Container Deployment (Production)
The Go Sync API (`api/`) is packaged as a lightweight Docker container (`api/Dockerfile`).
To deploy to Google Cloud Run (requires billing enabled on the project):
```bash
gcloud run deploy cloud-todo-api \
  --source ./api \
  --project cloud-todo-app-928 \
  --region us-central1 \
  --allow-unauthenticated
```
Or deploy for free on any container host (e.g., Render, Railway, Fly.io) pointing to `cloud-todo-app-928`.

