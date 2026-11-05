import React from 'react';
import { CheckSquare, Folder, Plus, Cloud, CloudOff, RefreshCw, AlertTriangle, Feather, Search, Sun, Moon } from 'lucide-react';
import { Project, SyncState } from '../types';

interface SidebarProps {
  currentProject: string | null;
  onSelectProject: (projectId: string | null) => void;
  projects: Project[];
  onNewProject: () => void;
  globalCount: number;
  syncState: SyncState;
  pendingCount: number;
  userEmail: string | null;
  onOpenDevices: () => void;
  onOpenCommand: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentProject,
  onSelectProject,
  projects,
  onNewProject,
  globalCount,
  syncState,
  pendingCount,
  userEmail,
  onOpenDevices,
  onOpenCommand,
  isDark,
  onToggleTheme,
}) => {
  const renderSyncBadge = () => {
    switch (syncState) {
      case 'SYNCED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sage/10 text-sage dark:text-sage-soft border border-sage/20">
            <span className="w-1.5 h-1.5 rounded-full bg-sage diode-pulse-green shrink-0"></span>
            <span>Synced</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-ember/15 text-ember border border-ember/25">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-ember shrink-0" />
            <span>{pendingCount} pending</span>
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sepia/10 text-sepia dark:text-sepia-soft border border-sepia/20">
            <CloudOff className="w-2.5 h-2.5 shrink-0" />
            <span>Offline</span>
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
            <span>Conflict</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sepia/10 text-sepia-soft border border-sepia/20">
            <Cloud className="w-2.5 h-2.5 shrink-0" />
            <span>Local</span>
          </span>
        );
    }
  };

  const renderRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/25 font-medium">
            OWNER
          </span>
        );
      case 'editor':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ember/15 text-ember border border-ember/25 font-medium">
            EDITOR
          </span>
        );
      case 'viewer':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sepia/15 text-sepia-soft border border-sepia/20 font-medium">
            VIEWER
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="w-64 bg-paper-3/40 dark:bg-ink-3 border-r border-line dark:border-line-ink flex flex-col justify-between shrink-0 h-full select-none text-ink-soft dark:text-paper-soft font-sans transition-colors">
      <div className="p-4 flex flex-col gap-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-ember/15 border border-ember/30 flex items-center justify-center text-ember shadow-sm">
              <Feather className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-ink dark:text-paper">Cloud Todo</span>
              <span className="text-[10px] text-sepia font-mono">Offline-First</span>
            </div>
          </div>
          {renderSyncBadge()}
        </div>

        {/* Quick Search / Command Button */}
        <button
          onClick={onOpenCommand}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink text-xs text-sepia hover:border-ember/40 hover:text-ink dark:hover:text-paper transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-ember" />
            <span>Search & Commands</span>
          </div>
          <kbd className="text-[10px] font-mono text-sepia bg-paper-3/60 dark:bg-ink px-1.5 py-0.5 rounded border border-line dark:border-line-ink">
            Ctrl+K
          </kbd>
        </button>

        {/* Global Tasks Nav */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-semibold text-sepia uppercase tracking-wider font-mono">
            Navigation
          </div>
          <button
            onClick={() => onSelectProject(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              currentProject === null
                ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper shadow-sm border border-line dark:border-line-ink'
                : 'text-ink-soft dark:text-paper-soft hover:bg-paper-2/60 dark:hover:bg-ink-2/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-4 h-4 text-ember shrink-0" />
              <span>All tasks</span>
            </div>
            <span className="text-[11px] font-mono text-sepia px-1.5 py-0.5 rounded bg-paper-3/60 dark:bg-ink/60 border border-line dark:border-line-ink">
              {globalCount}
            </span>
          </button>
        </div>

        {/* Projects Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 text-[10px] font-semibold text-sepia uppercase tracking-wider font-mono">
            <span>Collaborative Projects</span>
            <button
              onClick={onNewProject}
              title="Add project"
              className="p-1 rounded hover:bg-paper-2 dark:hover:bg-ink-2 text-sepia hover:text-ember transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentProject === p.id
                    ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper shadow-sm border border-line dark:border-line-ink'
                    : 'text-ink-soft dark:text-paper-soft hover:bg-paper-2/60 dark:hover:bg-ink-2/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Folder className={`w-3.5 h-3.5 shrink-0 ${currentProject === p.id ? 'text-ember' : 'text-sepia'}`} />
                  <span className="truncate">{p.name}</span>
                </div>
                {renderRoleBadge(p.role)}
              </button>
            ))}

            {projects.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-sepia italic">No projects yet</div>
            )}
          </div>
        </div>
      </div>

      {/* User & Settings Footer */}
      <div className="p-3 border-t border-line dark:border-line-ink bg-paper-2/40 dark:bg-ink-3 space-y-2">
        <button
          onClick={onOpenDevices}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-ink-soft dark:text-paper-soft hover:bg-paper-2 dark:hover:bg-ink-2 transition-colors border border-transparent hover:border-line dark:hover:border-line-ink"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-2 h-2 rounded-full bg-ember"></div>
            <span className="truncate text-xs font-medium">{userEmail || 'Local User'}</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-sepia px-1.5 py-0.5 rounded bg-paper-3/80 dark:bg-ink border border-line dark:border-line-ink">
            Devices
          </span>
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-sepia hover:bg-paper-2 dark:hover:bg-ink-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isDark ? <Sun className="w-3.5 h-3.5 text-ember" /> : <Moon className="w-3.5 h-3.5 text-ember" />}
            <span className="text-[11px] font-medium">{isDark ? 'Parchment Mode' : 'Darkroom Mode'}</span>
          </div>
          <span className="text-[10px] font-mono text-sepia uppercase">Theme</span>
        </button>
      </div>
    </aside>
  );
};
