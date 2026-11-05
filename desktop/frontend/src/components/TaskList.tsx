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
    <div className="flex-1 flex flex-col h-full bg-[#0c0d0e] border-r border-white/[0.06] overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#0c0d0e]/60 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm tracking-tight text-white">
              {currentProject ? currentProject.name : 'Global tasks'}
            </h1>
            <span className="text-[11px] font-mono text-zinc-500 px-1.5 py-0.2 rounded bg-white/[0.03]">
              {filteredTasks.length}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-normal">
            {filter === 'active' ? 'Active items' : filter === 'completed' ? 'Completed items' : 'All items'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentProject && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition-all hover:border-white/20"
            >
              <Share2 className="w-3 h-3 text-zinc-400" />
              <span>Share</span>
            </button>
          )}

          {/* Segmented Filter Control */}
          <div className="flex items-center p-0.5 bg-black/40 rounded-lg border border-white/[0.06] text-xs">
            {(['active', 'completed', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-md transition-all text-xs capitalize ${
                  filter === tab
                    ? 'bg-white/[0.1] text-white font-medium shadow-[0_1px_3px_rgba(0,0,0,0.5)]'
                    : 'text-zinc-500 hover:text-zinc-300'
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
        <div className="px-4 py-2.5 border-b border-white/[0.04] shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#121316] rounded-lg border border-white/[0.07] raycast-focus transition-all">
            <Plus className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Add task... (Press Enter)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs placeholder:text-zinc-600 outline-none text-zinc-200"
            />
            <kbd className="text-[10px] font-mono text-zinc-600 bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.05]">↵</kbd>
          </div>
        </div>
      )}

      {/* Task List Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filteredTasks.map(task => {
          const subtasks = tasks.filter(t => t.parentId === task.id);
          const completedSubtasks = subtasks.filter(t => t.completed).length;
          const isSelected = selectedTask?.id === task.id;

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-indigo-500/[0.08] text-white border border-indigo-500/30 shadow-[0_2px_12px_rgba(99,102,241,0.08)]'
                  : 'hover:bg-white/[0.025] text-zinc-300 border border-transparent'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={e => onToggleComplete(task, e)}
                disabled={isViewer}
                className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                  task.completed
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                    : 'border-white/20 hover:border-indigo-400 bg-white/[0.02]'
                } ${isViewer ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {task.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className={`text-xs tracking-tight truncate ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-200 font-medium'}`}>
                  {task.title}
                </div>

                {/* Metadata Chips */}
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500 flex-wrap">
                  {task.dueDate && (
                    <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-zinc-400">
                      <Calendar className="w-2.5 h-2.5 text-zinc-500" />
                      {task.dueDate}
                    </span>
                  )}

                  {subtasks.length > 0 && (
                    <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-zinc-400">
                      <Layers className="w-2.5 h-2.5 text-zinc-500" />
                      {completedSubtasks}/{subtasks.length}
                    </span>
                  )}

                  {task.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-0.5 text-[10px] text-zinc-400 font-mono">
                      <Tag className="w-2 h-2 text-zinc-600" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="py-16 text-center text-xs text-zinc-600 flex flex-col items-center gap-2">
            <Sparkles className="w-5 h-5 text-zinc-700" />
            <span>No tasks in this view</span>
          </div>
        )}
      </div>
    </div>
  );
};
