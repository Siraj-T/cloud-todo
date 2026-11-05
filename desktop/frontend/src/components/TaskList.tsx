import React, { useState } from 'react';
import { Plus, Check, Calendar, Tag, Share2, Layers } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-full bg-background border-r border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-semibold text-lg tracking-tight">
            {currentProject ? currentProject.name : 'Global tasks'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filteredTasks.length} {filter} task{filteredTasks.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentProject && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          )}

          {/* Filter Pills */}
          <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border/50 text-xs">
            <button
              onClick={() => setFilter('active')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'active' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'completed' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Done
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'all' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Task Input */}
      {!isViewer && (
        <div className="p-3 border-b border-border/60 bg-card/30 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border/80 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Add a new task... (Press Enter)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground/70 outline-none text-foreground"
            />
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2">
        {filteredTasks.map(task => {
          const subtasks = tasks.filter(t => t.parentId === task.id);
          const completedSubtasks = subtasks.filter(t => t.completed).length;
          const isSelected = selectedTask?.id === task.id;

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-secondary/90 text-foreground ring-1 ring-border/80 shadow-sm'
                  : 'hover:bg-accent/50 text-foreground/90'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={e => onToggleComplete(task, e)}
                disabled={isViewer}
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  task.completed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/40 hover:border-primary'
                } ${isViewer ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
              </button>

              {/* Task Details */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm tracking-tight truncate ${task.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                  {task.title}
                </div>

                {/* Badges / Metadata */}
                <div className="flex items-center gap-2.5 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  {task.dueDate && (
                    <span className="flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted/60">
                      <Calendar className="w-3 h-3 text-muted-foreground/80" />
                      {task.dueDate}
                    </span>
                  )}

                  {subtasks.length > 0 && (
                    <span className="flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted/60">
                      <Layers className="w-3 h-3 text-muted-foreground/80" />
                      {completedSubtasks}/{subtasks.length}
                    </span>
                  )}

                  {task.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-0.5 text-[11px] text-muted-foreground/90">
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No {filter !== 'all' ? filter : ''} tasks found
          </div>
        )}
      </div>
    </div>
  );
};
