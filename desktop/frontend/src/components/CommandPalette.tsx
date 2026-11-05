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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-28 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#111215]/95 border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] rounded-2xl overflow-hidden flex flex-col text-zinc-200">
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
          <Search className="w-4 h-4 text-indigo-400 mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search commands, tasks, or projects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm placeholder:text-zinc-500 outline-none text-white font-medium"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/[0.06] rounded border border-white/[0.08]">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-84 overflow-y-auto p-2 space-y-1">
          {/* Quick Actions */}
          <div className="px-2.5 py-1 text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
            Quick Actions
          </div>
          <button
            onClick={() => { onNewTask(); onClose(); }}
            className="w-full flex items-center px-2.5 py-2 text-xs rounded-lg hover:bg-white/[0.06] text-left group transition-all text-zinc-300 hover:text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-2.5 text-zinc-500 group-hover:text-indigo-400" />
            <span>Create new task</span>
          </button>
          <button
            onClick={() => { onNewProject(); onClose(); }}
            className="w-full flex items-center px-2.5 py-2 text-xs rounded-lg hover:bg-white/[0.06] text-left group transition-all text-zinc-300 hover:text-white"
          >
            <Folder className="w-3.5 h-3.5 mr-2.5 text-zinc-500 group-hover:text-indigo-400" />
            <span>Create new project</span>
          </button>
          <button
            onClick={() => { onOpenDevices(); onClose(); }}
            className="w-full flex items-center px-2.5 py-2 text-xs rounded-lg hover:bg-white/[0.06] text-left group transition-all text-zinc-300 hover:text-white"
          >
            <Laptop className="w-3.5 h-3.5 mr-2.5 text-zinc-500 group-hover:text-indigo-400" />
            <span>Manage signed-in devices</span>
          </button>
          <button
            onClick={() => { onToggleTheme(); onClose(); }}
            className="w-full flex items-center px-2.5 py-2 text-xs rounded-lg hover:bg-white/[0.06] text-left group transition-all text-zinc-300 hover:text-white"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 mr-2.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 mr-2.5 text-indigo-400" />}
            <span>Toggle {isDark ? 'Light' : 'Dark'} theme</span>
          </button>

          {/* Projects */}
          {filteredProjects.length > 0 && (
            <>
              <div className="px-2.5 pt-3 pb-1 text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
                Projects
              </div>
              {filteredProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelectProject(p.id); onClose(); }}
                  className="w-full flex items-center px-2.5 py-2 text-xs rounded-lg hover:bg-white/[0.06] text-left group transition-all text-zinc-300 hover:text-white"
                >
                  <Folder className="w-3.5 h-3.5 mr-2.5 text-zinc-500 group-hover:text-indigo-400" />
                  <span>{p.name}</span>
                </button>
              ))}
            </>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <>
              <div className="px-2.5 pt-3 pb-1 text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
                Tasks
              </div>
              {filteredTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => { onSelectTask(t); onClose(); }}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg hover:bg-white/[0.06] text-left group transition-all text-zinc-300 hover:text-white"
                >
                  <div className="flex items-center min-w-0">
                    <CheckCircle2 className={`w-3.5 h-3.5 mr-2.5 shrink-0 ${t.completed ? 'text-indigo-400' : 'text-zinc-600'}`} />
                    <span className="truncate">{t.title}</span>
                  </div>
                  {t.dueDate && <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-2">{t.dueDate}</span>}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Navigate with arrows</span>
          <span>Press Enter to select</span>
        </div>
      </div>
    </div>
  );
};
