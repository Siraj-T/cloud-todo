import React from 'react';
import { CheckSquare, Folder, Plus, Calendar, CheckCircle2, Tag, LogOut, Link2 } from 'lucide-react';
import { Project } from '../types';
import { User } from '../lib/firebase';

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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

interface SidebarProps {
  currentProject: string | null;
  onSelectProject: (projectId: string | null) => void;
  projects: Project[];
  onNewProject: () => void;
  onJoinProject?: () => void;
  globalCount: number;
  completedCount: number;
  dueTodayCount: number;
  selectedFilter: 'all' | 'dueToday' | 'completed';
  onSelectFilter: (filter: 'all' | 'dueToday' | 'completed') => void;
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentProject,
  onSelectProject,
  projects,
  onNewProject,
  onJoinProject,
  globalCount,
  completedCount,
  dueTodayCount,
  selectedFilter,
  onSelectFilter,
  tags,
  selectedTag,
  onSelectTag,
  user,
  onLogin,
  onLogout,
}) => {
  const renderRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-medium tracking-wide">
            OWNER
          </span>
        );
      case 'editor':
        return (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-ember/15 text-ember border border-ember/30 font-medium tracking-wide">
            EDITOR
          </span>
        );
      case 'viewer':
        return (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sepia/15 text-sepia border border-sepia/30 font-medium tracking-wide">
            VIEWER
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="w-72 bg-paper-2/50 dark:bg-ink-3/80 border-r border-line dark:border-line-ink flex flex-col justify-between shrink-0 h-full select-none text-ink dark:text-paper font-sans transition-colors">
      <div className="p-5 flex flex-col gap-6 overflow-y-auto">
        {/* Navigation Collections */}
        <div className="space-y-1.5">
          <div className="px-3 text-xs font-mono font-semibold text-sepia uppercase tracking-widest">
            Overview
          </div>

          <button
            onClick={() => {
              onSelectProject(null);
              onSelectFilter('all');
              onSelectTag(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentProject === null && selectedFilter === 'all' && selectedTag === null
                ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper shadow-card border border-line dark:border-line-ink font-semibold'
                : 'text-ink-soft dark:text-paper-soft hover:bg-paper-2/60 dark:hover:bg-ink-2/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckSquare className="w-4 h-4 text-ember shrink-0" />
              <span>All Tasks</span>
            </div>
            <span className="text-xs font-mono text-sepia px-2 py-0.5 rounded-full bg-paper-3/80 dark:bg-ink border border-line dark:border-line-ink">
              {globalCount}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectProject(null);
              onSelectFilter('dueToday');
              onSelectTag(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentProject === null && selectedFilter === 'dueToday'
                ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper shadow-card border border-line dark:border-line-ink font-semibold'
                : 'text-ink-soft dark:text-paper-soft hover:bg-paper-2/60 dark:hover:bg-ink-2/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-ember shrink-0" />
              <span>Due Today</span>
            </div>
            <span className="text-xs font-mono text-sepia px-2 py-0.5 rounded-full bg-paper-3/80 dark:bg-ink border border-line dark:border-line-ink">
              {dueTodayCount}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectProject(null);
              onSelectFilter('completed');
              onSelectTag(null);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentProject === null && selectedFilter === 'completed'
                ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper shadow-card border border-line dark:border-line-ink font-semibold'
                : 'text-ink-soft dark:text-paper-soft hover:bg-paper-2/60 dark:hover:bg-ink-2/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
              <span>Completed Archive</span>
            </div>
            <span className="text-xs font-mono text-sepia px-2 py-0.5 rounded-full bg-paper-3/80 dark:bg-ink border border-line dark:border-line-ink">
              {completedCount}
            </span>
          </button>
        </div>

        {/* Collaborative Projects */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 text-xs font-mono font-semibold text-sepia uppercase tracking-widest">
            <span>Collaborative Projects</span>
            <div className="flex items-center gap-1">
              {onJoinProject && (
                <button
                  onClick={onJoinProject}
                  title="Join project via invite link"
                  className="p-1 rounded-lg hover:bg-paper-2 dark:hover:bg-ink-2 text-sepia hover:text-ember transition-colors border border-transparent hover:border-line"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onNewProject}
                title="Add new project"
                className="p-1 rounded-lg hover:bg-paper-2 dark:hover:bg-ink-2 text-sepia hover:text-ember transition-colors border border-transparent hover:border-line"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectProject(p.id);
                  onSelectFilter('all');
                  onSelectTag(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  currentProject === p.id
                    ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper shadow-card border border-line dark:border-line-ink font-semibold'
                    : 'text-ink-soft dark:text-paper-soft hover:bg-paper-2/60 dark:hover:bg-ink-2/50'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Folder className={`w-4 h-4 shrink-0 ${currentProject === p.id ? 'text-ember' : 'text-sepia'}`} />
                  <span className="truncate">{p.name}</span>
                </div>
                {renderRoleBadge(p.role)}
              </button>
            ))}

            {projects.length === 0 && (
              <div className="px-3 py-3 text-xs text-sepia italic bg-paper-3/30 rounded-xl text-center">
                No active projects
              </div>
            )}
          </div>
        </div>

        {/* Tags Cloud Filter */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 text-xs font-mono font-semibold text-sepia uppercase tracking-widest">
              <span>Filter By Tag</span>
              {selectedTag && (
                <button
                  onClick={() => onSelectTag(null)}
                  className="text-xs text-ember hover:underline font-mono"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {tags.map(t => (
                <button
                  key={t}
                  onClick={() => onSelectTag(selectedTag === t ? null : t)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    selectedTag === t
                      ? 'bg-ember text-paper font-semibold shadow-sm'
                      : 'bg-paper-3/60 dark:bg-ink-2 text-sepia hover:text-ink dark:hover:text-paper border border-line dark:border-line-ink'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>#{t}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Account */}
      <div className="p-3 border-t border-line dark:border-line-ink bg-paper-2/40 dark:bg-ink-3">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google Account'}
                  className="w-7 h-7 rounded-full border border-line dark:border-line-ink shrink-0 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-ember/20 text-ember font-mono text-xs flex items-center justify-center font-bold shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-ink dark:text-paper truncate">
                  {user.displayName || 'Google Account'}
                </span>
                <span className="text-[10px] font-mono text-sepia truncate">
                  {user.email}
                </span>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out of Google"
                className="p-1.5 rounded-lg text-sepia hover:text-ember hover:bg-paper-3 dark:hover:bg-ink-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {onLogin && (
              <button
                onClick={onLogin}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-paper-2 dark:bg-ink-2 hover:bg-paper-3 dark:hover:bg-ink border border-line dark:border-line-ink text-xs font-medium text-ink dark:text-paper transition-all shadow-sm"
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </button>
            )}
            <p className="text-[10px] font-mono text-sepia text-center">
              Offline-First Mode
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
