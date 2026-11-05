import React, { useState, useEffect } from 'react';
import { Calendar, Tag, Trash2, Check, Plus, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { Task } from '../types';

interface TaskDetailProps {
  task: Task | null;
  subtasks: Task[];
  onSaveTask: (updated: Task) => void;
  onDeleteTask: (task: Task) => void;
  onAddSubtask: (parentID: string, title: string) => void;
  onToggleSubtaskComplete: (subtask: Task) => void;
  isViewer: boolean;
  onClose: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  subtasks,
  onSaveTask,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtaskComplete,
  isViewer,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setDueDate(task.dueDate || '');
      setTags(task.tags || []);
      setFieldError(null);
    }
  }, [task]);

  if (!task) {
    return (
      <div className="w-80 border-l border-white/[0.06] bg-[#090a0c] flex items-center justify-center p-6 text-xs text-zinc-600 italic select-none">
        Select a task to view details
      </div>
    );
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const trimmed = newTag.trim().toLowerCase();
      if (tags.length >= 20) {
        setFieldError('Maximum 20 tags allowed');
        return;
      }
      if (trimmed.length > 30) {
        setFieldError('Tag cannot exceed 30 characters');
        return;
      }
      if (!tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
      setNewTag('');
      setFieldError(null);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFieldError('Title cannot be empty');
      return;
    }
    if (trimmedTitle.length > 200) {
      setFieldError('Title cannot exceed 200 characters');
      return;
    }
    if (description.length > 10000) {
      setFieldError('Description cannot exceed 10,000 characters');
      return;
    }

    onSaveTask({
      ...task,
      title: trimmedTitle,
      description,
      dueDate: dueDate || null,
      tags,
    });
    setFieldError(null);
  };

  const handleCreateSubtask = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
      e.preventDefault();
      onAddSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  const isSubtask = Boolean(task.parentId);
  const completedSubtasksCount = subtasks.filter(s => s.completed).length;
  const progressPercent = subtasks.length > 0 ? (completedSubtasksCount / subtasks.length) * 100 : 0;

  return (
    <div className="w-88 border-l border-white/[0.06] bg-[#0a0b0d] flex flex-col h-full overflow-hidden shrink-0 select-none text-zinc-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
          {isSubtask ? 'Subtask details' : 'Task details'}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isViewer && (
        <div className="px-3.5 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Viewer mode: Read only</span>
        </div>
      )}

      {/* Detail Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {fieldError && (
          <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span>{fieldError}</span>
          </div>
        )}

        {/* Title Input - Borderless Headline Style */}
        <div className="space-y-1">
          <input
            type="text"
            disabled={isViewer}
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              setFieldError(null);
            }}
            placeholder="Task title..."
            maxLength={200}
            className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-zinc-600 outline-none border-b border-transparent focus:border-white/10 pb-1 transition-colors"
          />
          <div className="text-[10px] text-right text-zinc-600 font-mono">{title.length}/200</div>
        </div>

        {/* Properties: Due Date & Tags */}
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-2.5">
          {/* Due Date */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
              <Calendar className="w-3 h-3" />
              Due Date
            </span>
            <input
              type="date"
              disabled={isViewer}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] text-zinc-300 font-mono outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Tags Cloud */}
          <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                Tags ({tags.length}/20)
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] border border-white/[0.06] text-zinc-300"
                >
                  <span>#{tag}</span>
                  {!isViewer && (
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!isViewer && (
              <input
                type="text"
                placeholder="+ Add tag... (Enter)"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full px-2 py-1 bg-white/[0.03] rounded border border-white/[0.05] text-[10px] outline-none focus:border-white/20 text-zinc-300"
              />
            )}
          </div>
        </div>

        {/* Description Textarea */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Description</label>
          <textarea
            disabled={isViewer}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={10000}
            rows={5}
            placeholder="Write notes or markdown details..."
            className="w-full p-2.5 bg-white/[0.02] rounded-lg border border-white/[0.05] text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/10 resize-none leading-relaxed transition-colors"
          />
          <div className="text-[10px] text-right text-zinc-600 font-mono">{description.length}/10,000</div>
        </div>

        {/* Subtasks Section */}
        {!isSubtask && (
          <div className="space-y-2 pt-2 border-t border-white/[0.05]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Subtasks ({completedSubtasksCount}/{subtasks.length})
              </span>
              {subtasks.length > 0 && (
                <div className="w-16 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              {subtasks.map(st => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.04] text-xs"
                >
                  <button
                    onClick={() => onToggleSubtaskComplete(st)}
                    disabled={isViewer}
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                      st.completed
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-white/20 hover:border-indigo-400 bg-white/[0.02]'
                    }`}
                  >
                    {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                  <span className={`truncate flex-1 text-[11px] ${st.completed ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
                    {st.title}
                  </span>
                </div>
              ))}

              {!isViewer && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Plus className="w-3 h-3 text-zinc-600 shrink-0" />
                  <input
                    type="text"
                    placeholder="Add subtask... (Enter)"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleCreateSubtask}
                    className="w-full bg-transparent text-[11px] placeholder:text-zinc-600 outline-none text-zinc-300 py-1"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!isViewer && (
        <div className="p-3 border-t border-white/[0.06] bg-[#08090b]/90 backdrop-blur flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => onDeleteTask(task)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_1px_8px_rgba(99,102,241,0.3)]"
          >
            Save changes
          </button>
        </div>
      )}
    </div>
  );
};
