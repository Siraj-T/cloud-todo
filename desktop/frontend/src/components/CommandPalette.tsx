import React, { useEffect, useState } from 'react';
import { Search, Plus, Moon, Sun, CheckCircle2, Folder, Laptop } from 'lucide-react';
import { Task, Project } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onSelectProject: (projectId: string | null) => void;
  onNewTask: () => void;
  onNewProject: () => void;
  onOpenDevices: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  onSelectTask,
  onSelectProject,
  onNewTask,
  onNewProject,
  onOpenDevices,
  isDark,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-card border border-border/80 shadow-2xl rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground mr-2.5 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-3.5 bg-transparent text-sm placeholder:text-muted-foreground outline-none text-foreground"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground rounded border border-border">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {/* Quick Actions */}
          <div className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</div>
          <button
            onClick={() => { onNewTask(); onClose(); }}
            className="w-full flex items-center px-2.5 py-2 text-sm rounded-lg hover:bg-accent text-left group transition-colors"
          >
            <Plus className="w-4 h-4 mr-2.5 text-muted-foreground group-hover:text-primary" />
            <span>Create new task</span>
          </button>
          <button
            onClick={() => { onNewProject(); onClose(); }}
            className="w-full flex items-center px-2.5 py-2 text-sm rounded-lg hover:bg-accent text-left group transition-colors"
          >
            <Folder className="w-4 h-4 mr-2.5 text-muted-foreground group-hover:text-primary" />
            <span>Create new project</span>
          </button>
          <button
            onClick={() => { onOpenDevices(); onClose(); }}
            className="w-full flex items-center px-2.5 py-2 text-sm rounded-lg hover:bg-accent text-left group transition-colors"
          >
            <Laptop className="w-4 h-4 mr-2.5 text-muted-foreground group-hover:text-primary" />
            <span>Manage signed-in devices</span>
          </button>
          <button
            onClick={() => { onToggleTheme(); onClose(); }}
            className="w-full flex items-center px-2.5 py-2 text-sm rounded-lg hover:bg-accent text-left group transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 mr-2.5 text-amber-400" /> : <Moon className="w-4 h-4 mr-2.5 text-indigo-400" />}
            <span>Toggle {isDark ? 'Light' : 'Dark'} theme</span>
          </button>

          {/* Projects */}
          {filteredProjects.length > 0 && (
            <>
              <div className="px-2.5 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Projects</div>
              {filteredProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelectProject(p.id); onClose(); }}
                  className="w-full flex items-center px-2.5 py-2 text-sm rounded-lg hover:bg-accent text-left group transition-colors"
                >
                  <Folder className="w-4 h-4 mr-2.5 text-muted-foreground group-hover:text-primary" />
                  <span>{p.name}</span>
                </button>
              ))}
            </>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <>
              <div className="px-2.5 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tasks</div>
              {filteredTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => { onSelectTask(t); onClose(); }}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-sm rounded-lg hover:bg-accent text-left group transition-colors"
                >
                  <div className="flex items-center min-w-0">
                    <CheckCircle2 className={`w-4 h-4 mr-2.5 shrink-0 ${t.completed ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate">{t.title}</span>
                  </div>
                  {t.dueDate && <span className="text-xs text-muted-foreground shrink-0 ml-2">{t.dueDate}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
