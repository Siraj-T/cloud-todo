import React, { useState } from 'react';
import { Plus, Check, Calendar, Tag, Share2, Layers, Sparkles } from 'lucide-react';
import { Task, Project } from '../types';

interface TaskListProps {
  tasks: Task[];
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task, e: React.MouseEvent) => void;
  onAddTask: (title: string) => void;
  currentProject: Project | null;
  onOpenShare: () => void;
  isViewer: boolean;
  viewTitle: string;
  selectedTag: string | null;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  selectedTask,
  onSelectTask,
  onToggleComplete,
  onAddTask,
  currentProject,
  onOpenShare,
  isViewer,
  viewTitle,
  selectedTag,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');

  const rootTasks = tasks.filter(t => !t.parentId);

  const filteredTasks = rootTasks.filter(t => {
    if (selectedTag && (!t.tags || !t.tags.includes(selectedTag))) {
      return false;
    }
    if (statusFilter === 'active') return !t.completed;
    if (statusFilter === 'completed') return t.completed;
    return true;
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTitle.trim()) {
      e.preventDefault();
      onAddTask(newTitle.trim());
      setNewTitle('');
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAddTask(newTitle.trim());
      setNewTitle('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-paper dark:bg-ink overflow-y-auto select-none transition-colors">
      <div className="max-w-4xl mx-auto w-full p-6 sm:p-10 flex flex-col gap-8">
        
        {/* Editorial View Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-line dark:border-line-ink">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-ink dark:text-paper">
                {currentProject ? currentProject.name : viewTitle}
              </h1>
              {selectedTag && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-ember/15 text-ember border border-ember/30 font-medium">
                  #{selectedTag}
                </span>
              )}
            </div>
            <p className="font-sans text-sm text-sepia mt-1">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'recorded item' : 'recorded items'} in current perspective
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentProject && (
              <button
                onClick={onOpenShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-paper-2 dark:bg-ink-2 hover:bg-paper-3 dark:hover:bg-ink text-ink dark:text-paper border border-line dark:border-line-ink transition-all shadow-card hover:border-ember/40"
              >
                <Share2 className="w-3.5 h-3.5 text-ember" />
                <span>Collaborators</span>
              </button>
            )}

            {/* Segmented Filter Pills */}
            <div className="flex items-center p-1 bg-paper-2 dark:bg-ink-2 rounded-xl border border-line dark:border-line-ink shadow-sm">
              {(['active', 'completed', 'all'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    statusFilter === tab
                      ? 'bg-paper dark:bg-ink-3 text-ink dark:text-paper shadow-sm border border-line dark:border-line-ink font-semibold'
                      : 'text-sepia hover:text-ink dark:hover:text-paper'
                  }`}
                >
                  {tab === 'completed' ? 'Done' : tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Add Dropzone-Style Card */}
        {!isViewer && (
          <form
            onSubmit={handleQuickAddSubmit}
            className="p-3 sm:p-4 rounded-2xl bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-card focus-within:border-ember focus-within:ring-2 focus-within:ring-ember/20 transition-all flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-paper-3/80 dark:bg-ink/80 flex items-center justify-center text-ember shrink-0">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <input
              type="text"
              placeholder="Record a new task, requirement, or reflection... (Press Enter)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm placeholder:text-sepia outline-none text-ink dark:text-paper font-sans"
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 shadow-sm ${
                newTitle.trim()
                  ? 'bg-ember hover:bg-ember-deep text-paper shadow-ember/25 cursor-pointer'
                  : 'bg-paper-3/60 dark:bg-ink-3 text-sepia/60 cursor-not-allowed border border-line dark:border-line-ink'
              }`}
            >
              Add Task
            </button>
          </form>
        )}

        {/* Tasks Card Stream */}
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const subtasks = tasks.filter(t => t.parentId === task.id);
            const completedSubtasks = subtasks.filter(t => t.completed).length;
            const isSelected = selectedTask?.id === task.id;

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`group flex items-start gap-4 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper border-line dark:border-line-ink border-l-[5px] !border-l-ember shadow-card-elevated'
                    : 'bg-paper-2 dark:bg-ink-2 hover:bg-paper-3/70 dark:hover:bg-ink-2/80 text-ink dark:text-paper border-line dark:border-line-ink shadow-card hover:shadow-md'
                }`}
              >
                {/* Custom Incarn Checkbox */}
                <button
                  onClick={e => onToggleComplete(task, e)}
                  disabled={isViewer}
                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                    task.completed
                      ? 'bg-sage border-sage text-paper shadow-sm'
                      : 'border-sepia/40 hover:border-ember bg-paper dark:bg-ink'
                  } ${isViewer ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Task Body */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm sm:text-base tracking-tight leading-snug transition-all ${
                      task.completed
                        ? 'line-through text-sepia/80'
                        : 'text-ink dark:text-paper font-medium'
                    }`}
                  >
                    {task.title}
                  </div>

                  {task.description && (
                    <p className="text-xs text-ink-soft dark:text-paper-soft mt-1 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Metadata Chips Bar */}
                  <div className="flex items-center gap-2.5 mt-3 text-xs text-sepia flex-wrap">
                    {task.dueDate && (
                      <span className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-0.5 rounded-full bg-paper-3/80 dark:bg-ink border border-line dark:border-line-ink text-sepia">
                        <Calendar className="w-3 h-3 text-ember" />
                        {task.dueDate}
                      </span>
                    )}

                    {subtasks.length > 0 && (
                      <span className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-0.5 rounded-full bg-paper-3/80 dark:bg-ink border border-line dark:border-line-ink text-sepia">
                        <Layers className="w-3 h-3 text-sepia" />
                        {completedSubtasks}/{subtasks.length} subtasks
                      </span>
                    )}

                    {task.tags?.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs text-sepia font-mono px-2 py-0.5 rounded-full bg-paper-3/60 dark:bg-ink border border-line dark:border-line-ink"
                      >
                        <Tag className="w-2.5 h-2.5 text-ember" />
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="py-24 text-center text-sm text-sepia flex flex-col items-center gap-4 bg-paper-2/40 dark:bg-ink-2/30 rounded-3xl border border-dashed border-line dark:border-line-ink">
              <div className="w-12 h-12 rounded-2xl bg-paper-2 dark:bg-ink-2 flex items-center justify-center text-ember border border-line dark:border-line-ink shadow-card">
                <Sparkles className="w-6 h-6 text-ember" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-xl text-ink dark:text-paper font-medium">Clear Canvas</h3>
                <p className="text-xs text-sepia">No items found in this perspective. Record a new task to get started.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
