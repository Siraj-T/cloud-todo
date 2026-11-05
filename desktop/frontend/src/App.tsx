import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { CommandPalette } from './components/CommandPalette';
import { ShareModal } from './components/ShareModal';
import { DevicesModal } from './components/DevicesModal';
import { ConflictModal } from './components/ConflictModal';
import { Task, Project, SyncState, DeviceSession } from './types';

// Mock seed tasks for demonstration & initial offline work
const initialTasks: Task[] = [
  {
    id: 't-1',
    ownerUid: 'user-1',
    projectId: 'p-1',
    title: 'Build local storage in SQLite',
    description: 'Persist all tasks, projects, and outbox mutations atomically.',
    dueDate: '2026-11-10',
    tags: ['go', 'sqlite'],
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
    title: 'Write migration rollback tests',
    description: '',
    dueDate: null,
    tags: ['sqlite'],
    completed: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't-3',
    ownerUid: 'user-1',
    projectId: 'p-1',
    title: 'Connect React bindings and Linear UI',
    description: 'Wire up Wails bridge and polish dark theme styling.',
    dueDate: '2026-11-12',
    tags: ['react', 'wails'],
    completed: false,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't-4',
    ownerUid: 'user-1',
    projectId: null,
    title: 'Weekly planning review',
    description: 'Review pending personal tasks outside projects.',
    dueDate: '2026-11-08',
    tags: ['personal'],
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
    name: 'Learn Wails',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role: 'owner',
  },
  {
    id: 'p-2',
    ownerUid: 'user-1',
    name: 'Home Renovation',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role: 'editor',
  },
];

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('p-1');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('t-1');

  // Modals & Palette
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
  const [conflictModalData, setConflictModalData] = useState<{ local: Task; cloud: Task } | null>(null);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>('SYNCED');
  const [pendingCount, setPendingCount] = useState(0);

  // Theme
  const [isDark, setIsDark] = useState(true);

  // Active devices
  const [devices, setDevices] = useState<DeviceSession[]>([
    { sessionId: 's-1', deviceName: 'My Laptop', platform: 'windows', lastSeenAt: 'Just now', isCurrent: true },
    { sessionId: 's-2', deviceName: 'Test Phone', platform: 'android', lastSeenAt: '2 hours ago', isCurrent: false },
  ]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const currentProject = projects.find(p => p.id === selectedProjectId) || null;
  const isViewer = currentProject?.role === 'viewer';

  // Filter tasks for current view (project or global)
  const currentTasks = tasks.filter(t => {
    if (selectedProjectId === null) return t.projectId === null;
    return t.projectId === selectedProjectId;
  });

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;
  const subtasks = selectedTask ? tasks.filter(t => t.parentId === selectedTask.id) : [];
  const globalCount = tasks.filter(t => t.projectId === null && !t.completed).length;

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
      tags: [],
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
      ? `Deleting "${task.title}" will also delete ${directChildren.length} subtask(s). Proceed?`
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
    const name = prompt('Enter project name:');
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
    // Generates simulated invite link based on contract
    const token = Math.random().toString(36).substring(2, 15);
    return `cloudtodo://invite/${token}`;
  };

  const handleRevokeDevice = async (sessionId: string) => {
    setDevices(devices.filter(d => d.sessionId !== sessionId));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased font-sans">
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
        syncState={syncState}
        pendingCount={pendingCount}
        userEmail="siraj.altarhouni5@gmail.com"
        onOpenDevices={() => setIsDevicesOpen(true)}
      />

      {/* Center Task List */}
      <TaskList
        tasks={currentTasks}
        selectedTask={selectedTask}
        onSelectTask={task => setSelectedTaskId(task.id)}
        onToggleComplete={handleToggleComplete}
        onAddTask={handleAddTask}
        currentProject={currentProject}
        onOpenShare={() => setIsShareOpen(true)}
        isViewer={isViewer}
      />

      {/* Right Task Details */}
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
