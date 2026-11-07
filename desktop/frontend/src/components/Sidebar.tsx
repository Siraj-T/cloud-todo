import React from 'react';
import { CheckSquare, Folder, Plus, Calendar, CheckCircle2, Tag } from 'lucide-react';
import { Project } from '../types';

interface SidebarProps {
  currentProject: string | null;
  onSelectProject: (projectId: string | null) => void;
  projects: Project[];
  onNewProject: () => void;
  globalCount: number;
  completedCount: number;
  dueTodayCount: number;
  selectedFilter: 'all' | 'dueToday' | 'completed';
  onSelectFilter: (filter: 'all' | 'dueToday' | 'completed') => void;
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentProject,
  onSelectProject,
  projects,
  onNewProject,
  globalCount,
  completedCount,
  dueTodayCount,
  selectedFilter,
  onSelectFilter,
  tags,
  selectedTag,
  onSelectTag,
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
            <button
              onClick={onNewProject}
              title="Add new project"
              className="p-1 rounded-lg hover:bg-paper-2 dark:hover:bg-ink-2 text-sepia hover:text-ember transition-colors border border-transparent hover:border-line"
            >
              <Plus className="w-4 h-4" />
            </button>
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

      {/* Footer */}
      <div className="p-3 border-t border-line dark:border-line-ink bg-paper-2/40 dark:bg-ink-3">
        <p className="text-[11px] font-mono text-sepia text-center">
          Cloud Todo Desktop
        </p>
      </div>
    </aside>
  );
};
