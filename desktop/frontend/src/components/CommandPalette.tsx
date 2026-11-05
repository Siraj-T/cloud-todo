import React, { useEffect, useState } from 'react';
import { Search, Plus, Moon, Sun, CheckCircle2, Folder, Laptop, Feather } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-ink/75 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-xl bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-2xl rounded-2xl overflow-hidden flex flex-col text-ink dark:text-paper transition-all">
        {/* Search Bar */}
        <div className="flex items-center px-5 py-4 border-b border-line dark:border-line-ink bg-paper-2 dark:bg-ink-2">
          <Search className="w-4 h-4 text-ember mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, task title, or project name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm placeholder:text-sepia outline-none text-ink dark:text-paper font-medium"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-sepia bg-paper-3/70 dark:bg-ink rounded-md border border-line dark:border-line-ink">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1.5">
          {/* Quick Actions */}
          <div className="px-3 py-1 text-[10px] font-mono font-semibold text-sepia uppercase tracking-wider">
            Quick Actions
          </div>
          <button
            onClick={() => { onNewTask(); onClose(); }}
            className="w-full flex items-center px-3 py-2 text-xs rounded-lg hover:bg-paper-3/60 dark:hover:bg-ink/60 text-left group transition-all text-ink dark:text-paper"
          >
            <Plus className="w-4 h-4 mr-3 text-sepia group-hover:text-ember" />
            <span>Create new task</span>
          </button>
          <button
            onClick={() => { onNewProject(); onClose(); }}
            className="w-full flex items-center px-3 py-2 text-xs rounded-lg hover:bg-paper-3/60 dark:hover:bg-ink/60 text-left group transition-all text-ink dark:text-paper"
          >
            <Folder className="w-4 h-4 mr-3 text-sepia group-hover:text-ember" />
            <span>Create new project</span>
          </button>
          <button
            onClick={() => { onOpenDevices(); onClose(); }}
            className="w-full flex items-center px-3 py-2 text-xs rounded-lg hover:bg-paper-3/60 dark:hover:bg-ink/60 text-left group transition-all text-ink dark:text-paper"
          >
            <Laptop className="w-4 h-4 mr-3 text-sepia group-hover:text-ember" />
            <span>Manage signed-in devices</span>
          </button>
          <button
            onClick={() => { onToggleTheme(); onClose(); }}
            className="w-full flex items-center px-3 py-2 text-xs rounded-lg hover:bg-paper-3/60 dark:hover:bg-ink/60 text-left group transition-all text-ink dark:text-paper"
          >
            {isDark ? (
              <Sun className="w-4 h-4 mr-3 text-sepia group-hover:text-ember" />
            ) : (
              <Moon className="w-4 h-4 mr-3 text-sepia group-hover:text-ember" />
            )}
            <span>Switch to {isDark ? 'Incarn Parchment (Light)' : 'Incarn Darkroom (Dark)'}</span>
          </button>

          {/* Jump to Project */}
          {filteredProjects.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 text-[10px] font-mono font-semibold text-sepia uppercase tracking-wider">
                Projects
              </div>
              {filteredProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelectProject(p.id); onClose(); }}
                  className="w-full flex items-center px-3 py-2 text-xs rounded-lg hover:bg-paper-3/60 dark:hover:bg-ink/60 text-left group transition-all text-ink dark:text-paper"
                >
                  <Folder className="w-4 h-4 mr-3 text-sepia group-hover:text-ember" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </>
          )}

          {/* Search Results */}
          {filteredTasks.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 text-[10px] font-mono font-semibold text-sepia uppercase tracking-wider">
                Matching Tasks
              </div>
              {filteredTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => { onSelectTask(t); onClose(); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-paper-3/60 dark:hover:bg-ink/60 text-left group transition-all text-ink dark:text-paper"
                >
                  <div className="flex items-center gap-3 truncate">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${t.completed ? 'text-sage' : 'text-sepia group-hover:text-ember'}`} />
                    <span className={`truncate ${t.completed ? 'line-through text-sepia' : ''}`}>{t.title}</span>
                  </div>
                  {t.dueDate && (
                    <span className="text-[10px] font-mono text-sepia ml-2 shrink-0">{t.dueDate}</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-paper/60 dark:bg-ink-3 border-t border-line dark:border-line-ink flex items-center justify-between text-[11px] text-sepia font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Dismiss</span>
          </div>
          <div className="flex items-center gap-1.5 text-ember">
            <Feather className="w-3.5 h-3.5" />
            <span>Incarn Theme</span>
          </div>
        </div>
      </div>
    </div>
  );
};
