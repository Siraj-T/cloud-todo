import React from 'react';
import { CheckSquare, Folder, Plus, Laptop, Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
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
}) => {
  const renderSyncBadge = () => {
    switch (syncState) {
      case 'SYNCED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Synced
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            {pendingCount} pending
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <CloudOff className="w-3 h-3" />
            Offline
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" />
            Conflict
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Cloud className="w-3 h-3" />
            Local only
          </span>
        );
    }
  };

  return (
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur flex flex-col justify-between shrink-0 h-full select-none">
      <div className="p-4 flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm">
              CT
            </div>
            <span className="font-semibold text-sm tracking-tight">Cloud Todo</span>
          </div>
          {renderSyncBadge()}
        </div>

        {/* Navigation Categories */}
        <div className="space-y-1">
          <button
            onClick={() => onSelectProject(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              currentProject === null
                ? 'bg-secondary text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-4 h-4" />
              <span>Global tasks</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{globalCount}</span>
          </button>
        </div>

        {/* Projects Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Projects</span>
            <button
              onClick={onNewProject}
              title="Add project"
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group ${
                  currentProject === p.id
                    ? 'bg-secondary text-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Folder className="w-4 h-4 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </div>
                {p.role && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground uppercase">
                    {p.role}
                  </span>
                )}
              </button>
            ))}

            {projects.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground/60 italic">No projects yet</div>
            )}
          </div>
        </div>
      </div>

      {/* User & Settings Footer */}
      <div className="p-3 border-t border-border bg-card/40">
        <button
          onClick={onOpenDevices}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <Laptop className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{userEmail || 'Local user'}</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground/80">Devices</span>
        </button>
      </div>
    </aside>
  );
};
