import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { CommandPalette } from './components/CommandPalette';
import { ShareModal } from './components/ShareModal';
import { DevicesModal } from './components/DevicesModal';
import { ConflictModal } from './components/ConflictModal';
import { Task, Project, SyncState, DeviceSession } from './types';
import { Search, Sun, Moon, Laptop, CheckSquare, LogOut } from 'lucide-react';
import { signInWithGoogle, logOut, onAuthStateChanged, auth, User } from './lib/firebase';

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'dueToday' | 'completed'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals & Palette
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
  const [conflictModalData, setConflictModalData] = useState<{ local: Task; cloud: Task } | null>(null);

  // Firebase Auth & API Session State
  const API_BASE = 'http://localhost:8080';
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  const buildHeaders = (token: string, user: User) => ({
    'Content-Type': 'application/json',
    'X-Device-Token': token,
    'X-User-Email': user.email || '',
    'X-Email-Verified': 'true',
  });

  const enrollWithAPI = async (user: User): Promise<string | null> => {
    const existing = localStorage.getItem(`cloudtodo_device_token_${user.uid}`);
    // Verify existing token is still valid in current API memory; if not, re-enroll
    if (existing) {
      try {
        const check = await fetch(`${API_BASE}/devices`, {
          headers: buildHeaders(existing, user),
        });
        if (check.ok) return existing;
      } catch {}
    }
    try {
      const res = await fetch(`${API_BASE}/sessions/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          deviceName: 'Cloud Todo Desktop',
          platform: 'windows',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem(`cloudtodo_device_token_${user.uid}`, data.token);
          return data.token;
        }
      }
    } catch {}
    return existing;
  };

  const pullSync = async (tokenOverride?: string, userOverride?: User) => {
    const token = tokenOverride || deviceToken;
    const user = userOverride || currentUser;
    if (!token || !user) return;

    try {
      const cursor = localStorage.getItem(`cloudtodo_cursor_${user.uid}`) || '0';
      const res = await fetch(`${API_BASE}/sync/pull?cursor=${encodeURIComponent(cursor)}`, {
        headers: buildHeaders(token, user),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.changes) && data.changes.length > 0) {
        setTasks(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          for (const ch of data.changes) {
            if (ch.operation === 'DELETE') {
              map.delete(ch.entityId);
            } else if (ch.entity) {
              const incoming = ch.entity as Task;
              map.set(ch.entityId, { ...incoming, version: ch.version || incoming.version || 1 });
            }
          }
          return Array.from(map.values());
        });
      }
      if (data.nextCursor) {
        localStorage.setItem(`cloudtodo_cursor_${user.uid}`, String(data.nextCursor));
      }
      setSyncState('SYNCED');
    } catch {}
  };

  const pushTaskMutation = async (operation: 'CREATE' | 'UPDATE' | 'DELETE', task: Task, baseVersion: number) => {
    if (!deviceToken || !currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/sync/push`, {
        method: 'POST',
        headers: buildHeaders(deviceToken, currentUser),
        body: JSON.stringify({
          mutations: [
            {
              mutationId: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              entityId: task.id,
              baseVersion,
              operation,
              payload: task,
            },
          ],
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const first = data.results?.[0];
      if (first?.status === 'accepted') {
        if (operation !== 'DELETE' && first.version) {
          setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, version: first.version } : t)));
        }
        setSyncState('SYNCED');
        setPendingCount(0);
      } else if (first?.status === 'conflict' && first.serverEntity) {
        setConflictModalData({ local: task, cloud: first.serverEntity as Task });
        setSyncState('CONFLICT');
      }
    } catch {}
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Load strictly this account's partitioned tasks and projects (empty [] for fresh users)
        let loadedProjects: Project[] = [];
        try {
          const savedTasks = localStorage.getItem(`cloudtodo_tasks_${user.uid}`);
          const savedProjects = localStorage.getItem(`cloudtodo_projects_${user.uid}`);
          setTasks(savedTasks ? JSON.parse(savedTasks) : []);
          loadedProjects = savedProjects ? JSON.parse(savedProjects) : [];
          setProjects(loadedProjects);
        } catch {
          setTasks([]);
          setProjects([]);
        }
        const token = await enrollWithAPI(user);
        setDeviceToken(token);
        if (token) {
          // Ensure locally owned projects are registered in current API session
          for (const p of loadedProjects) {
            if (p.role === 'owner') {
              fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: buildHeaders(token, user),
                body: JSON.stringify({ id: p.id, name: p.name }),
              }).catch(() => {});
            }
          }
          await pullSync(token, user);
        }
      } else {
        // Signed out: clear all workspace data from memory
        setTasks([]);
        setProjects([]);
        setDeviceToken(null);
      }
      setSelectedProjectId(null);
      setSelectedTaskId(null);
      setSelectedFilter('all');
      setSelectedTag(null);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Periodic background sync pull every 5 seconds while signed in
  useEffect(() => {
    if (!currentUser || !deviceToken) return;
    const timer = setInterval(() => {
      pullSync();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentUser, deviceToken]);

  // Persist tasks per-account whenever they change
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`cloudtodo_tasks_${currentUser.uid}`, JSON.stringify(tasks));
    }
  }, [tasks, currentUser]);

  // Persist projects per-account whenever they change
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`cloudtodo_projects_${currentUser.uid}`, JSON.stringify(projects));
    }
  }, [projects, currentUser]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.error('Google Sign-In Error:', err);
        alert('Sign-in failed: ' + (err?.message || 'Unknown error'));
      }
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logOut();
    } catch (err: any) {
      console.error('Sign Out Error:', err);
    }
  };

  // Sync state
  const [, setSyncState] = useState<SyncState>('SYNCED');
  const [, setPendingCount] = useState(0);

  // Theme with localStorage persistence
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });

  // Active devices (current session)
  const [devices, setDevices] = useState<DeviceSession[]>([
    { sessionId: 's-1', deviceName: 'This Windows Desktop', platform: 'windows', lastSeenAt: 'Just now', isCurrent: true },
  ]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Aggregated tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [tasks]);

  // Counts
  const globalCount = tasks.filter(t => !t.parentId && !t.completed).length;
  const completedCount = tasks.filter(t => !t.parentId && t.completed).length;
  const dueTodayCount = tasks.filter(t => !t.parentId && !t.completed && t.dueDate === todayStr).length;

  const currentProject = projects.find(p => p.id === selectedProjectId) || null;
  const isViewer = currentProject?.role === 'viewer';

  // Filter tasks based on project / perspective
  const currentTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedProjectId) {
        return t.projectId === selectedProjectId;
      }
      if (selectedFilter === 'dueToday') {
        return t.dueDate === todayStr && !t.completed;
      }
      if (selectedFilter === 'completed') {
        return t.completed;
      }
      return true; // 'all'
    });
  }, [tasks, selectedProjectId, selectedFilter, todayStr]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;
  const subtasks = selectedTask ? tasks.filter(t => t.parentId === selectedTask.id) : [];

  // Task Actions
  const handleToggleComplete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isViewer) return;

    const updated = { ...task, completed: !task.completed, updatedAt: new Date().toISOString() };
    setTasks(tasks.map(t => (t.id === task.id ? updated : t)));
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
    pushTaskMutation('UPDATE', updated, task.version);
  };

  const handleAddTask = (title: string) => {
    if (isViewer || !currentUser) return;
    const newTask: Task = {
      id: `t-${Date.now()}`,
      ownerUid: currentUser.uid,
      projectId: selectedProjectId,
      title,
      description: '',
      tags: selectedTag ? [selectedTag] : [],
      completed: false,
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks([newTask, ...tasks]);
    setSelectedTaskId(newTask.id);
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
    pushTaskMutation('CREATE', newTask, 0);
  };

  const handleSaveTask = (updated: Task) => {
    if (isViewer) return;
    const next = { ...updated, updatedAt: new Date().toISOString() };
    setTasks(tasks.map(t => (t.id === updated.id ? next : t)));
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
    pushTaskMutation('UPDATE', next, updated.version);
  };

  const handleDeleteTask = (task: Task) => {
    if (isViewer) return;
    const directChildren = tasks.filter(t => t.parentId === task.id);
    const affectedCount = 1 + directChildren.length;

    const msg = affectedCount > 1
      ? `Deleting "${task.title}" will also permanently remove ${directChildren.length} child subtask(s). Proceed?`
      : `Delete "${task.title}"?`;

    if (confirm(msg)) {
      setTasks(tasks.filter(t => t.id !== task.id && t.parentId !== task.id));
      if (selectedTaskId === task.id) {
        setSelectedTaskId(null);
      }
      setPendingCount(prev => prev + 1);
      setSyncState('PENDING');
      pushTaskMutation('DELETE', task, task.version);
      directChildren.forEach(c => pushTaskMutation('DELETE', c, c.version));
    }
  };

  const handleAddSubtask = (parentId: string, title: string) => {
    if (isViewer || !currentUser) return;
    const newSubtask: Task = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ownerUid: currentUser.uid,
      projectId: selectedProjectId,
      parentId,
      title,
      description: '',
      tags: [],
      completed: false,
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks([...tasks, newSubtask]);
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
    pushTaskMutation('CREATE', newSubtask, 0);
  };

  const handleToggleSubtaskComplete = (subtask: Task) => {
    if (isViewer) return;
    const updated = { ...subtask, completed: !subtask.completed, updatedAt: new Date().toISOString() };
    setTasks(tasks.map(t => (t.id === subtask.id ? updated : t)));
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
    pushTaskMutation('UPDATE', updated, subtask.version);
  };

  const handleNewProject = async () => {
    if (!currentUser) return;
    const name = prompt('Enter project title:');
    if (name && name.trim()) {
      const newProj: Project = {
        id: `p-${Date.now()}`,
        ownerUid: currentUser.uid,
        name: name.trim(),
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: 'owner',
      };
      setProjects([...projects, newProj]);
      setSelectedProjectId(newProj.id);
      setSelectedTaskId(null);

      if (deviceToken) {
        try {
          await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: buildHeaders(deviceToken, currentUser),
            body: JSON.stringify({ id: newProj.id, name: newProj.name }),
          });
        } catch {}
      }
    }
  };

  const handleSendInvite = async (email: string, role: string) => {
    if (!currentProject || !currentUser) {
      throw new Error('No active project or user');
    }
    const token = deviceToken || (await enrollWithAPI(currentUser));
    if (!token) {
      throw new Error('Could not reach sync API on localhost:8080');
    }
    const res = await fetch(`${API_BASE}/projects/${currentProject.id}/invitations`, {
      method: 'POST',
      headers: buildHeaders(token, currentUser),
      body: JSON.stringify({
        email,
        role,
        projectName: currentProject.name,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send invitation');
    }
    return data.inviteLink as string;
  };

  const handleJoinProject = async () => {
    if (!currentUser) return;
    const raw = prompt('Paste invite link or token (e.g. cloudtodo://invite/...):');
    if (!raw || !raw.trim()) return;
    const inviteToken = raw.trim().replace(/^cloudtodo:\/\/invite\//i, '');

    const token = deviceToken || (await enrollWithAPI(currentUser));
    if (!token) {
      alert('Sync API on localhost:8080 is offline.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/invitations/${encodeURIComponent(inviteToken)}/accept`, {
        method: 'POST',
        headers: buildHeaders(token, currentUser),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not accept invitation');
        return;
      }

      const joinedProj: Project = {
        id: data.projectId,
        ownerUid: currentUser.uid,
        name: data.projectName || `Shared Project (${data.projectId})`,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: data.role || 'editor',
      };
      setProjects(prev => {
        if (prev.some(p => p.id === joinedProj.id)) return prev;
        return [...prev, joinedProj];
      });
      setSelectedProjectId(joinedProj.id);
      setSelectedTaskId(null);
      await pullSync(token, currentUser);
    } catch (err: any) {
      alert('Failed to join project: ' + (err?.message || 'Network error'));
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!currentProject || !currentUser) return;
    const token = deviceToken || (await enrollWithAPI(currentUser));
    if (!token) return;
    await fetch(`${API_BASE}/projects/${currentProject.id}/members/remove`, {
      method: 'POST',
      headers: buildHeaders(token, currentUser),
      body: JSON.stringify({ email }),
    }).catch(() => {});
  };

  const handleRevokeDevice = async (sessionId: string) => {
    setDevices(devices.filter(d => d.sessionId !== sessionId));
  };

  const getViewTitle = () => {
    if (currentProject) return currentProject.name;
    if (selectedFilter === 'dueToday') return 'Due Today';
    if (selectedFilter === 'completed') return 'Completed Archive';
    return 'The Master Agenda';
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-paper text-ink dark:bg-ink dark:text-paper font-sans">
        <div className="w-10 h-10 rounded-xl bg-ember/15 border border-ember/30 flex items-center justify-center text-ember mb-4 animate-pulse">
          <CheckSquare className="w-5 h-5" />
        </div>
        <p className="text-xs font-mono text-sepia">Checking authentication...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-paper text-ink dark:bg-ink dark:text-paper font-sans p-6 select-none transition-colors">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-ember/15 border border-ember/30 flex items-center justify-center text-ember shadow-sm">
            <CheckSquare className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink dark:text-paper">
              TodoApp
            </h1>
            <p className="text-sm text-sepia leading-relaxed">
              Sign in with your Google account to access your private workspace, personal tasks, and shared projects.
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-paper dark:bg-ink-3 hover:bg-paper-3 dark:hover:bg-ink border border-line dark:border-line-ink text-sm font-semibold text-ink dark:text-paper shadow-card hover:border-ember/50 transition-all cursor-pointer"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <p className="text-[11px] font-mono text-sepia/80">
            Each Google account has its own isolated tasks &amp; projects.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-paper text-ink dark:bg-ink dark:text-paper antialiased font-sans transition-colors">
      
      {/* Top Global Editorial Header */}
      <header className="h-16 px-6 border-b border-line dark:border-line-ink bg-paper/90 dark:bg-ink/90 backdrop-blur-md flex items-center justify-between shrink-0 z-30 transition-colors">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ember/15 border border-ember/30 flex items-center justify-center text-ember shadow-sm">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-semibold tracking-tight text-ink dark:text-paper leading-none">
              TodoApp
            </span>
            <span className="text-[11px] font-mono text-sepia tracking-wide">
              Offline-First Tasks
            </span>
          </div>
        </div>

        {/* Center Quick Search Capsule */}
        <button
          onClick={() => setIsCommandOpen(true)}
          className="hidden md:flex items-center justify-between gap-4 px-4 py-2 w-80 rounded-full bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-card hover:border-ember/40 text-sepia hover:text-ink dark:hover:text-paper transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-ember" />
            <span className="text-xs font-sans">Search tasks, projects, or tags...</span>
          </div>
          <kbd className="text-[10px] font-mono text-sepia bg-paper-3/80 dark:bg-ink px-2 py-0.5 rounded-full border border-line dark:border-line-ink">
            Ctrl+K
          </kbd>
        </button>

        {/* Right Status Controls */}
        <div className="flex items-center gap-2.5">
          {/* Google Auth Status / Login */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-sm text-xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google Account'}
                  className="w-5 h-5 rounded-full object-cover shrink-0 border border-line dark:border-line-ink"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-ember/20 text-ember text-[10px] font-bold flex items-center justify-center">
                  {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline font-medium text-ink dark:text-paper max-w-[120px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
              <button
                onClick={handleGoogleSignOut}
                title="Sign out of Google"
                className="text-sepia hover:text-ember transition-colors p-0.5 ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper-2 dark:bg-ink-2 hover:bg-paper-3 dark:hover:bg-ink border border-line dark:border-line-ink text-xs font-medium text-ink dark:text-paper shadow-sm transition-all"
            >
              <GoogleIcon />
              <span className="hidden sm:inline">Sign in with Google</span>
            </button>
          )}

          {/* Signed-in Devices Trigger */}
          <button
            onClick={() => setIsDevicesOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper-2 dark:bg-ink-2 hover:bg-paper-3 dark:hover:bg-ink border border-line dark:border-line-ink text-xs text-sepia hover:text-ink dark:hover:text-paper transition-all shadow-sm"
          >
            <Laptop className="w-3.5 h-3.5 text-ember" />
            <span className="hidden sm:inline">Devices</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2 rounded-full bg-paper-2 dark:bg-ink-2 hover:bg-paper-3 dark:hover:bg-ink border border-line dark:border-line-ink text-ember transition-all shadow-sm"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Workspace (Sidebar + Canvas + Inspector) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentProject={selectedProjectId}
          onSelectProject={id => {
            setSelectedProjectId(id);
            setSelectedTaskId(null);
          }}
          projects={projects}
          onNewProject={handleNewProject}
          onJoinProject={handleJoinProject}
          globalCount={globalCount}
          completedCount={completedCount}
          dueTodayCount={dueTodayCount}
          selectedFilter={selectedFilter}
          onSelectFilter={f => setSelectedFilter(f)}
          tags={allTags}
          selectedTag={selectedTag}
          onSelectTag={t => setSelectedTag(t)}
          user={currentUser}
          onLogin={handleGoogleSignIn}
          onLogout={handleGoogleSignOut}
        />

        {/* Center Task List Canvas */}
        <TaskList
          tasks={currentTasks}
          selectedTask={selectedTask}
          onSelectTask={task => setSelectedTaskId(task.id)}
          onToggleComplete={handleToggleComplete}
          onAddTask={handleAddTask}
          currentProject={currentProject}
          onOpenShare={() => setIsShareOpen(true)}
          isViewer={isViewer}
          viewTitle={getViewTitle()}
          selectedTag={selectedTag}
        />

        {/* Right Task Inspector */}
        <TaskDetail
          task={selectedTask}
          subtasks={subtasks}
          onSaveTask={handleSaveTask}
          onDeleteTask={handleDeleteTask}
          onAddSubtask={handleAddSubtask}
          onToggleSubtaskComplete={handleToggleSubtaskComplete}
          isViewer={isViewer}
          onClose={() => setSelectedTaskId(null)}
        />
      </div>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        tasks={tasks}
        projects={projects}
        onSelectTask={t => {
          setSelectedProjectId(t.projectId || null);
          setSelectedTaskId(t.id);
        }}
        onSelectProject={setSelectedProjectId}
        onNewTask={() => {
          const title = prompt('New task title:');
          if (title) handleAddTask(title);
        }}
        onNewProject={handleNewProject}
        onOpenDevices={() => setIsDevicesOpen(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        project={currentProject}
        ownerEmail={currentUser.email || currentUser.displayName || currentUser.uid}
        onClose={() => setIsShareOpen(false)}
        onSendInvite={handleSendInvite}
        onRemoveMember={handleRemoveMember}
      />

      {/* Devices Modal */}
      <DevicesModal
        isOpen={isDevicesOpen}
        onClose={() => setIsDevicesOpen(false)}
        devices={devices}
        onRevokeDevice={handleRevokeDevice}
      />

      {/* Conflict Resolution Modal */}
      {conflictModalData && (
        <ConflictModal
          isOpen={true}
          localTask={conflictModalData.local}
          cloudTask={conflictModalData.cloud}
          onUseCloud={() => {
            setTasks(tasks.map(t => (t.id === conflictModalData.cloud.id ? conflictModalData.cloud : t)));
            setConflictModalData(null);
            setSyncState('SYNCED');
          }}
          onUseLocal={() => {
            setConflictModalData(null);
            setSyncState('SYNCED');
          }}
        />
      )}
    </div>
  );
};

export default App;
