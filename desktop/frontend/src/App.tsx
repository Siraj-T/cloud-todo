import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { CommandPalette } from './components/CommandPalette';
import { ShareModal } from './components/ShareModal';
import { DevicesModal } from './components/DevicesModal';
import { ConflictModal } from './components/ConflictModal';
import { Task, Project, SyncState, DeviceSession } from './types';
import { Search, Sun, Moon, Laptop, RefreshCw, CloudOff, AlertTriangle } from 'lucide-react';

const initialTasks: Task[] = [
  {
    id: 't-1',
    ownerUid: 'user-1',
    projectId: 'p-1',
    title: 'Atomic local SQLite persistence and mutation outbox',
    description: 'Ensure transactions commit task changes and sync mutation records atomically without partial writes.',
    dueDate: '2026-11-10',
    tags: ['go', 'sqlite', 'persistence'],
    completed: false,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't-2',
    ownerUid: 'user-1',
    projectId: 'p-1',
    parentId: 't-1',
    title: '5,000-task write latency benchmark verification',
    description: 'Verify 95th percentile local write latency remains under 100 milliseconds.',
    dueDate: null,
    tags: ['benchmark', 'sqlite'],
    completed: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't-3',
    ownerUid: 'user-1',
    projectId: 'p-1',
    title: 'Incarn tactile parchment design & typography',
    description: 'Harmonize warm paper tones, Newsreader serif, Roboto UI text, and hardware optical diode sync pulses.',
    dueDate: '2026-11-06',
    tags: ['design', 'incarn', 'typography'],
    completed: false,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't-4',
    ownerUid: 'user-1',
    projectId: null,
    title: 'Offline-first synchronization review',
    description: 'Verify synchronization outbox retry mechanisms and conflict detection contracts.',
    dueDate: '2026-11-06',
    tags: ['architecture', 'roadmap'],
    completed: false,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialProjects: Project[] = [
  {
    id: 'p-1',
    ownerUid: 'user-1',
    name: 'Cloud Todo Core',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role: 'owner',
  },
  {
    id: 'p-2',
    ownerUid: 'user-1',
    name: 'Editorial Systems',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role: 'editor',
  },
];

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('t-3');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'dueToday' | 'completed'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals & Palette
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
  const [conflictModalData, setConflictModalData] = useState<{ local: Task; cloud: Task } | null>(null);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>('SYNCED');
  const [pendingCount, setPendingCount] = useState(0);

  // Default to Incarn Parchment (Light) Theme!
  const [isDark, setIsDark] = useState(false);

  // Active devices
  const [devices, setDevices] = useState<DeviceSession[]>([
    { sessionId: 's-1', deviceName: 'Primary Desktop', platform: 'windows', lastSeenAt: 'Just now', isCurrent: true },
    { sessionId: 's-2', deviceName: 'Companion Tablet', platform: 'android', lastSeenAt: '1 hour ago', isCurrent: false },
  ]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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

    setTasks(tasks.map(t => (t.id === task.id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t)));
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
  };

  const handleAddTask = (title: string) => {
    if (isViewer) return;
    const newTask: Task = {
      id: `t-${Date.now()}`,
      ownerUid: 'user-1',
      projectId: selectedProjectId,
      title,
      description: '',
      tags: selectedTag ? [selectedTag] : [],
      completed: false,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks([newTask, ...tasks]);
    setSelectedTaskId(newTask.id);
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
  };

  const handleSaveTask = (updated: Task) => {
    if (isViewer) return;
    setTasks(tasks.map(t => (t.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : t)));
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
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
    }
  };

  const handleAddSubtask = (parentId: string, title: string) => {
    if (isViewer) return;
    const newSubtask: Task = {
      id: `st-${Date.now()}`,
      ownerUid: 'user-1',
      projectId: selectedProjectId,
      parentId,
      title,
      description: '',
      tags: [],
      completed: false,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks([...tasks, newSubtask]);
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
  };

  const handleToggleSubtaskComplete = (subtask: Task) => {
    if (isViewer) return;
    setTasks(tasks.map(t => (t.id === subtask.id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t)));
    setPendingCount(prev => prev + 1);
    setSyncState('PENDING');
  };

  const handleNewProject = () => {
    const name = prompt('Enter project title:');
    if (name && name.trim()) {
      const newProj: Project = {
        id: `p-${Date.now()}`,
        ownerUid: 'user-1',
        name: name.trim(),
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: 'owner',
      };
      setProjects([...projects, newProj]);
      setSelectedProjectId(newProj.id);
      setSelectedTaskId(null);
    }
  };

  const handleSendInvite = async (_email: string, _role: string) => {
    const token = Math.random().toString(36).substring(2, 15);
    return `cloudtodo://invite/${token}`;
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-paper text-ink dark:bg-ink dark:text-paper antialiased font-sans transition-colors">
      
      {/* Top Global Editorial Header */}
      <header className="h-16 px-6 border-b border-line dark:border-line-ink bg-paper/90 dark:bg-ink/90 backdrop-blur-md flex items-center justify-between shrink-0 z-30 transition-colors">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-full bg-ember/15 border border-ember/30 flex items-center justify-center text-ember shadow-sm">
            <svg className="h-5 w-auto" viewBox="0 0 88 116" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="44" cy="14" rx="8.5" ry="7.5" stroke="currentColor" stroke-width="4" />
              <line x1="44" y1="21" x2="44" y2="26" stroke="currentColor" stroke-width="4" />
              <ellipse cx="44" cy="68" rx="36" ry="44" stroke="currentColor" stroke-width="5" />
              <ellipse cx="44" cy="68" rx="27" ry="34" stroke="currentColor" stroke-width="2" fill="rgba(196,112,58,0.2)" />
            </svg>
          </div>
          <div>
            <span className="font-display italic text-2xl font-medium tracking-tight text-ink dark:text-paper leading-none">
              Incarn Todo
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
        <div className="flex items-center gap-3">
          
          {/* Live Optical Diode Status Badge */}
          {syncState === 'SYNCED' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-sage/10 text-sage dark:text-sage-soft border border-sage/25">
              <span className="w-2 h-2 rounded-full bg-sage diode-pulse-green shrink-0"></span>
              <span className="hidden sm:inline">Database Synced</span>
            </div>
          )}

          {syncState === 'PENDING' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-ember/15 text-ember border border-ember/30">
              <RefreshCw className="w-3 h-3 animate-spin text-ember shrink-0" />
              <span>{pendingCount} pending</span>
            </div>
          )}

          {syncState === 'OFFLINE' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-sepia/15 text-sepia border border-sepia/30">
              <CloudOff className="w-3 h-3 shrink-0" />
              <span>Offline Mode</span>
            </div>
          )}

          {syncState === 'CONFLICT' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Conflict</span>
            </div>
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
            title={isDark ? 'Switch to Incarn Parchment (Light)' : 'Switch to Incarn Darkroom (Dark)'}
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
          globalCount={globalCount}
          completedCount={completedCount}
          dueTodayCount={dueTodayCount}
          selectedFilter={selectedFilter}
          onSelectFilter={f => setSelectedFilter(f)}
          tags={allTags}
          selectedTag={selectedTag}
          onSelectTag={t => setSelectedTag(t)}
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
        onClose={() => setIsShareOpen(false)}
        onSendInvite={handleSendInvite}
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
