# Cloud Todo

Cloud Todo is an offline-first, multi-user task management application built with **Go**, **React 19**, **TypeScript**, **SQLite**, and **Gin**. 

It is designed so you can create, edit, organize, and manage personal tasks on your computer completely offline with zero latency, while seamlessly synchronizing shared projects, sending email invitations, and collaborating with team members whenever you are connected to the internet.

---

## Key Features

* **Offline-First Speed & Durability**: All task operations write directly to an embedded local SQLite database (`~/.cloudtodo/todo.db`) using atomic transactions in `<1ms`. If your internet drops, the app never crashes or freezes—changes safely accumulate in an outbox queue and sync automatically when connectivity returns.
* **Task Organization & 1-Level Subtasks**:
  * Global standalone tasks (kept strictly private to your machine).
  * Project-based tasks with single-level subtasks (prevents confusing infinite nesting).
  * Calendar due dates (`YYYY-MM-DD` stored without timezone distortion).
  * Case-insensitive, deduplicated tags.
  * Cascade deletion with confirmation modals displaying affected child task counts.
* **Google Authentication**:
  * Connected via Firebase Auth using a secure popup flow (`signInWithPopup`).
  * Completes Google OAuth in a popup window without disruptive page redirects, keeping your local offline task queue completely safe.
  * Reactively reflects user identity, Google profile photo, and display name.
* **Cloud Sync & Conflict Resolution (OCC)**:
  * Automated 15-second bidirectional sync loop between desktop clients and the Gin Cloud API.
  * Optimistic Concurrency Control (OCC) detects concurrent edits on the same task.
  * Side-by-side visual conflict diff modal lets you choose between *"Review Local Version"* or *"Use Cloud Version"* without losing work.
* **Project Sharing & Role-Based Access (RBAC)**:
  * **Owner**: Full project management, invite members, and delete project.
  * **Editor**: Create, edit, complete, and delete project tasks.
  * **Viewer**: Strictly read-only access.
* **Transactional Email Invitations**:
  * Powered by the **Resend** REST API to dispatch branded HTML project invitations.
  * Includes a zero-dependency environment loader (`loadEnv()`) that automatically reads `api/.env`.
  * Includes `User-Agent: Cloud-Todo/1.0` header to pass Cloudflare edge bot protection.
  * Falls back to **Simulation Mode** in local development if no API key is configured, logging invitation links directly to the console.
* **Per-Device Session Revocation**:
  * Each physical machine receives a unique 32-byte opaque device session token, stored as a SHA-256 cryptographic hash on the server.
  * Revoking a specific laptop immediately blocks its cloud access with `401 Unauthorized` without logging out other devices.
* **Native Desktop Notifications**:
  * Native Windows Action Center toast notifications with audio alerts for due-date reminders and real-time collaborator updates via Server-Sent Events (SSE).
* **Modern Interface**:
  * Built with React 19, TypeScript, and Tailwind CSS.
  * Elegant typography hierarchy combining warm **Newsreader** serif headings with legible **Roboto** body text.
  * Dark and Light theme toggle with automatic `localStorage` persistence.
  * `Ctrl+K` keyboard-driven Command Palette with quick navigation and search.

---

## Architecture & Project Structure

The project is cleanly split into two components:

```text
todoappproject/
├── desktop/                    # Desktop Client (Runs locally)
│   ├── app.go                  # Bridge coordinating UI actions with SQLite & Sync
│   ├── main.go                 # Local server (:3456) serving embedded React UI
│   ├── internal/
│   │   ├── domain/             # Business rules, validation & subtask hierarchy
│   │   ├── notify/             # Windows Action Center toast notification engine
│   │   ├── store/              # SQLite persistence (WAL mode, transactions, outbox)
│   │   └── sync/               # 15-second background sync engine & HTTP client
│   └── frontend/               # React 19 + TypeScript + Tailwind CSS UI
│
├── api/                        # Cloud Sync API Server (Gin Web Framework)
│   ├── cmd/server/main.go      # Server entry point & zero-dependency .env loader
│   ├── internal/
│   │   ├── email/              # Resend REST API integration & simulation fallback
│   │   ├── server/             # Gin router, requireAuth middleware & route handlers
│   │   └── storage/            # Cloud vault storage & SHA-256 token hash manager
│   ├── .env                    # Secret API keys (ignored by git)
│   └── Dockerfile              # Multi-stage container build (<25MB Alpine image)
│
└── firestore.rules             # Unbreakable vault rule (blocks direct client access)
```

---

## How to Run

### 1-Click Native Desktop App (Recommended)
Simply double-click **`Cloud-Todo.exe`**:
* Opens a dedicated native application window (no browser tabs or address bar).
* Automatically checks and boots the Cloud Sync API (`cloud-todo-api.exe`) in the background if it is not already running.
* Automatically terminates background workers cleanly when the desktop window is closed.

---

### Running from Source / Terminal
If you prefer running directly from terminal:

```bash
# Start Desktop App (auto-boots API if offline)
cd desktop
go run .
```

*To run the Cloud API manually in its own terminal to observe live sync and Resend email logs:*
```bash
cd api
go run ./cmd/server
```
