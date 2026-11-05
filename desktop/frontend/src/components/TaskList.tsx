import React, { useState } from 'react';
import { Plus, Check, Calendar, Tag, Share2, Layers, Feather } from 'lucide-react';
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
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  const rootTasks = tasks.filter(t => !t.parentId);

  const filteredTasks = rootTasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTitle.trim()) {
      e.preventDefault();
      onAddTask(newTitle.trim());
      setNewTitle('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-paper dark:bg-ink border-r border-line dark:border-line-ink overflow-hidden select-none transition-colors">
      {/* Header */}
      <div className="px-6 py-4 border-b border-line dark:border-line-ink flex items-center justify-between shrink-0 bg-paper/80 dark:bg-ink/80 backdrop-blur">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-semibold text-base tracking-tight text-ink dark:text-paper">
              {currentProject ? currentProject.name : 'All Tasks'}
            </h1>
            <span className="text-[11px] font-mono text-sepia px-2 py-0.5 rounded-full bg-paper-3/60 dark:bg-ink-2 border border-line dark:border-line-ink">
              {filteredTasks.length}
            </span>
          </div>
          <p className="text-xs text-ink-soft dark:text-sepia mt-0.5 font-normal">
            {filter === 'active' ? 'Pending items' : filter === 'completed' ? 'Completed archive' : 'All recorded items'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentProject && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-paper-2 dark:bg-ink-2 hover:bg-paper-3 dark:hover:bg-ink text-ink dark:text-paper border border-line dark:border-line-ink transition-all shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-ember" />
              <span>Share</span>
            </button>
          )}

          {/* Segmented Filter Control */}
          <div className="flex items-center p-0.5 bg-paper-3/70 dark:bg-ink-3 rounded-lg border border-line dark:border-line-ink text-xs">
            {(['active', 'completed', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-md transition-all text-xs capitalize ${
                  filter === tab
                    ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper font-medium shadow-sm border border-line dark:border-line-ink'
                    : 'text-sepia hover:text-ink dark:hover:text-paper'
                }`}
              >
                {tab === 'completed' ? 'Done' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Add Task Input */}
      {!isViewer && (
        <div className="px-6 py-3 border-b border-line dark:border-line-ink shrink-0 bg-paper-2/40 dark:bg-ink-2/30">
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-paper-2 dark:bg-ink-2 rounded-lg border border-line dark:border-line-ink focus-within:border-ember focus-within:ring-2 focus-within:ring-ember/20 transition-all shadow-sm">
            <Plus className="w-4 h-4 text-sepia shrink-0" />
            <input
              type="text"
              placeholder="Record a new task... (Press Enter to save)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs placeholder:text-sepia-soft outline-none text-ink dark:text-paper font-sans"
            />
            <kbd className="text-[10px] font-mono text-sepia bg-paper-3/60 dark:bg-ink/60 px-1.5 py-0.5 rounded border border-line dark:border-line-ink">
              ↵ Return
            </kbd>
          </div>
        </div>
      )}

      {/* Task List Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredTasks.map(task => {
          const subtasks = tasks.filter(t => t.parentId === task.id);
          const completedSubtasks = subtasks.filter(t => t.completed).length;
          const isSelected = selectedTask?.id === task.id;

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className={`group flex items-start gap-3 px-3.5 py-3 rounded-lg cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-paper-2 dark:bg-ink-2 text-ink dark:text-paper border-line dark:border-line-ink border-l-4 !border-l-ember shadow-sm'
                  : 'hover:bg-paper-2/60 dark:hover:bg-ink-2/40 text-ink dark:text-paper border-transparent'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={e => onToggleComplete(task, e)}
                disabled={isViewer}
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                  task.completed
                    ? 'bg-sage border-sage text-paper shadow-sm'
                    : 'border-sepia/40 hover:border-ember bg-paper-2 dark:bg-ink-2'
                } ${isViewer ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className={`text-xs tracking-tight truncate ${task.completed ? 'line-through text-sepia' : 'text-ink dark:text-paper font-medium'}`}>
                  {task.title}
                </div>

                {/* Metadata Chips */}
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-sepia flex-wrap">
                  {task.dueDate && (
                    <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-paper-3/50 dark:bg-ink-3 border border-line dark:border-line-ink text-sepia">
                      <Calendar className="w-2.5 h-2.5 text-ember" />
                      {task.dueDate}
                    </span>
                  )}

                  {subtasks.length > 0 && (
                    <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-paper-3/50 dark:bg-ink-3 border border-line dark:border-line-ink text-sepia">
                      <Layers className="w-2.5 h-2.5 text-sepia" />
                      {completedSubtasks}/{subtasks.length} subtasks
                    </span>
                  )}

                  {task.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] text-sepia font-mono px-1.5 py-0.5 rounded bg-paper-3/40 dark:bg-ink-3 border border-line/50 dark:border-line-ink/50">
                      <Tag className="w-2 h-2 text-ember" />
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="py-20 text-center text-xs text-sepia flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-paper-3/60 dark:bg-ink-2 flex items-center justify-center text-sepia">
              <Feather className="w-5 h-5 text-ember" />
            </div>
            <span>No tasks recorded in this perspective</span>
          </div>
        )}
      </div>
    </div>
  );
};
