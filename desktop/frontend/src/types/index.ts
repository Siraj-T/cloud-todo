export interface Task {
  id: string;
  ownerUid: string;
  projectId?: string | null;
  parentId?: string | null;
  title: string;
  description: string;
  dueDate?: string | null; // YYYY-MM-DD
  tags: string[];
  completed: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Project {
  id: string;
  ownerUid: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  role?: 'owner' | 'editor' | 'viewer';
}

export type SyncState = 'LOCAL_ONLY' | 'OFFLINE' | 'PENDING' | 'SYNCED' | 'CONFLICT' | 'SIGN_IN_REQUIRED';

export interface ConflictDetails {
  entityId: string;
  localTask: Task;
  cloudTask: Task;
}

export interface DeviceSession {
  sessionId: string;
  deviceName: string;
  platform: string;
  lastSeenAt: string;
  isCurrent: boolean;
}
