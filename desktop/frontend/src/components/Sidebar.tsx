import React from 'react';
import { CheckSquare, Folder, Plus, Cloud, CloudOff, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Synced
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />
            {pendingCount} pending
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
            <CloudOff className="w-2.5 h-2.5" />
            Offline
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/25 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
            <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
            Conflict
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
            <Cloud className="w-2.5 h-2.5" />
            Local only
          </span>
        );
    }
  };

  const renderRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">OWNER</span>;
      case 'editor':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">EDITOR</span>;
      case 'viewer':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">VIEWER</span>;
      default:
        return null;
    }
  };

  return (
    <aside className="w-60 bg-[#08090b] border-r border-white/[0.06] flex flex-col justify-between shrink-0 h-full select-none text-zinc-300">
      <div className="p-3.5 flex flex-col gap-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1.5 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs shadow-[0_0_12px_rgba(99,102,241,0.2)]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-[13px] tracking-tight text-white">Cloud Todo</span>
          </div>
          {renderSyncBadge()}
        </div>

        {/* Global Tasks Nav */}
        <div className="space-y-0.5">
          <button
            onClick={() => onSelectProject(null)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all ${
              currentProject === null
                ? 'bg-white/[0.08] text-white font-medium shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span>Global tasks</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.03]">{globalCount}</span>
          </button>
        </div>

        {/* Projects Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
            <span>Projects</span>
            <button
              onClick={onNewProject}
              title="Add project"
              className="p-1 rounded hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-0.5">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all ${
                  currentProject === p.id
                    ? 'bg-white/[0.08] text-white font-medium shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className={`w-3.5 h-3.5 shrink-0 ${currentProject === p.id ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <span className="truncate">{p.name}</span>
                </div>
                {renderRoleBadge(p.role)}
              </button>
            ))}

            {projects.length === 0 && (
              <div className="px-2.5 py-2 text-[11px] text-zinc-600 italic">No projects yet</div>
            )}
          </div>
        </div>
      </div>

      {/* User & Settings Footer */}
      <div className="p-2.5 border-t border-white/[0.05] bg-[#070709]/80">
        <button
          onClick={onOpenDevices}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="truncate text-[11px]">{userEmail || 'Local user'}</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 px-1 py-0.5 rounded bg-white/[0.04]">
            Devices
          </span>
        </button>
      </div>
    </aside>
  );
};
