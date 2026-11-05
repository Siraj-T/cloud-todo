# Cloud Todo (`cloud-todo`)

An offline-first desktop todo application engineered with **Go**, **React 19**, **TypeScript**, **Wails**, **SQLite**, and **Firebase/Firestore**.

Designed with a sleek Linear/Raycast aesthetic, robust offline durability, optimistic outbox sync, explicit conflict resolution, role-based project sharing, per-device revocation, and native desktop notifications.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│               Desktop App (Wails + React)              │
│  ┌───────────────────────┐   ┌───────────────────────┐ │
│  │   React 19 + TS UI    │   │  Go Core & Services   │ │
│  │  Tailwind + Radix UI  │◄─►│ SQLite / Outbox Queue │ │
│  │  Linear/Raycast Theme │   │ Native Windows Toast  │ │
│  └───────────────────────┘   └───────────┬───────────┘ │
└──────────────────────────────────────────┼─────────────┘
                                           │ HTTPS REST API
                                           ▼
┌────────────────────────────────────────────────────────┐
│                   Go Cloud Sync API                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Auth & Device Session Middleware (Hashed Token) │  │
│  │  Mutation Engine & Version Conflict Detector     │  │
│  │  Project RBAC (Owner / Editor / Viewer)          │  │
│  │  Feed Fanout & Real-time Event Broadcaster       │  │
│  └──────────────────────────┬───────────────────────┘  │
└─────────────────────────────┼──────────────────────────┘
                              │ Firebase Admin SDK
                              ▼
┌────────────────────────────────────────────────────────┐
│              Firebase Cloud Infrastructure             │
│   • Firebase Authentication (Email/Password, Google)   │
│   • Cloud Firestore (Deny-all client rules)            │
│   • Firebase Cloud Messaging (FCM / Push Engine)       │
└────────────────────────────────────────────────────────┘
```

## Features

- **Offline-First Durability**: Full offline CRUD functionality. Writes are committed atomically with outbox mutation records in local SQLite transactions.
- **Hierarchical Tasks**: Root tasks and 1-level subtasks with independent completion status. Subtasks inherit project/personal scope.
- **Explicit Conflict Resolution**: Optimistic versioning detects concurrent edits. Side-by-side diffing lets users inspect remote changes vs local drafts without losing work.
- **Project Collaboration & RBAC**:
  - **Owner**: Manage members, invite via secure token, delete projects.
  - **Editor**: Create, edit, complete, reopen, and delete project tasks.
  - **Viewer**: Read-only view with mutation controls hidden.
- **Per-Device Session Revocation**: Granularly list and revoke specific device sessions without invalidating other devices or wiping local offline data.
- **Desktop & Push Notifications**:
  - Native Windows desktop notifications for shared project activities (invitations, task updates, sync conflicts).
  - Local due-date reminder alerts.
- **Modern UI / UX**:
  - Linear/Raycast-inspired dark and light themes.
  - Keyboard-driven workflows (`Ctrl+K` command palette, `Esc` navigation).
  - Clear, non-color-dependent sync status badges (`Local only`, `Offline`, `Pending`, `Synced`, `Conflict`).

---

## Tech Stack

- **Desktop Framework**: Wails + Go
- **Frontend**: React 19, TypeScript, Tailwind CSS, Radix UI, Lucide Icons, Vite
- **Local Persistence**: Pure-Go SQLite (`modernc.org/sqlite`, zero CGO dependency)
- **Cloud Backend**: Go HTTP service (`net/http`, chi/mux) with Firebase Admin SDK
- **Cloud Persistence**: Firebase Authentication + Cloud Firestore

---

## License

MIT © [Siraj-T](https://github.com/Siraj-T)
