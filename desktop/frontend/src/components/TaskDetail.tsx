import React, { useState, useEffect } from 'react';
import { Calendar, Tag, Trash2, Check, AlertCircle, X, ShieldAlert, Layers } from 'lucide-react';
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
      <div className="w-88 border-l border-line dark:border-line-ink bg-paper-3/20 dark:bg-ink-3 flex items-center justify-center p-6 text-xs text-sepia italic select-none font-sans">
        Select a task to review details
      </div>
    );
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const trimmed = newTag.trim().toLowerCase();
      if (tags.length >= 20) {
        setFieldError('Maximum 20 tags permitted');
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
  const progressPercent = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  return (
    <div className="w-96 border-l border-line dark:border-line-ink bg-paper-2/50 dark:bg-ink-3 flex flex-col h-full overflow-hidden shrink-0 select-none text-ink dark:text-paper font-sans transition-colors">
      {/* Header */}
      <div className="px-5 py-4 border-b border-line dark:border-line-ink flex items-center justify-between shrink-0 bg-paper-2/80 dark:bg-ink/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-sepia">
            {isSubtask ? 'Subtask Details' : 'Task Details'}
          </span>
          <span className="text-[10px] font-mono text-sepia px-1.5 py-0.2 rounded bg-paper-3/60 dark:bg-ink-2">
            v{task.version}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-paper-3 dark:hover:bg-ink-2 text-sepia hover:text-ink dark:hover:text-paper transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isViewer && (
        <div className="px-4 py-2 bg-gold/15 border-b border-gold/25 text-gold text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Viewer permission: Read-only observation</span>
        </div>
      )}

      {/* Detail Form */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {fieldError && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fieldError}</span>
          </div>
        )}

        {/* Title Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sepia">
            Title
          </label>
          <input
            type="text"
            disabled={isViewer}
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              setFieldError(null);
            }}
            placeholder="Task headline..."
            maxLength={200}
            className="w-full bg-paper-2 dark:bg-ink-2 px-3 py-2 rounded-lg border border-line dark:border-line-ink text-sm font-medium text-ink dark:text-paper placeholder:text-sepia-soft outline-none focus:border-ember focus:ring-2 focus:ring-ember/20 transition-all shadow-sm"
          />
          <div className="text-[10px] text-right text-sepia font-mono">{title.length}/200 characters</div>
        </div>

        {/* Properties: Due Date & Tags Card */}
        <div className="p-3.5 rounded-xl bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink space-y-3 shadow-sm">
          {/* Due Date */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-sepia text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-ember" />
              Due Date
            </span>
            <input
              type="date"
              disabled={isViewer}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="px-2.5 py-1 rounded-md bg-paper-3/70 dark:bg-ink border border-line dark:border-line-ink text-xs text-ink dark:text-paper font-mono outline-none focus:border-ember"
            />
          </div>

          {/* Tags Cloud */}
          <div className="space-y-2 pt-2 border-t border-line dark:border-line-ink">
            <div className="flex items-center justify-between text-xs text-sepia">
              <span className="flex items-center gap-1.5 font-medium">
                <Tag className="w-3.5 h-3.5 text-ember" />
                Tags ({tags.length}/20)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono bg-paper-3/70 dark:bg-ink border border-line dark:border-line-ink text-sepia"
                >
                  <span>#{tag}</span>
                  {!isViewer && (
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {!isViewer && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Add tag and press Enter..."
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  maxLength={30}
                  className="w-full bg-paper-3/50 dark:bg-ink px-2.5 py-1 rounded-md border border-line dark:border-line-ink text-xs text-ink dark:text-paper placeholder:text-sepia-soft outline-none focus:border-ember font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sepia">
            Description
          </label>
          <textarea
            disabled={isViewer}
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Record detailed notes, requirements, or reflections..."
            maxLength={10000}
            className="w-full bg-paper-2 dark:bg-ink-2 p-3 rounded-xl border border-line dark:border-line-ink text-xs leading-relaxed text-ink dark:text-paper placeholder:text-sepia-soft outline-none focus:border-ember focus:ring-2 focus:ring-ember/20 transition-all shadow-sm resize-none"
          />
          <div className="text-[10px] text-right text-sepia font-mono">{description.length}/10,000 characters</div>
        </div>

        {/* Subtasks (Only 1 level deep allowed by domain rule) */}
        {!isSubtask && (
          <div className="space-y-2.5 p-3.5 rounded-xl bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-sepia">
                <Layers className="w-3.5 h-3.5 text-ember" />
                Subtasks ({completedSubtasksCount}/{subtasks.length})
              </span>
              {subtasks.length > 0 && (
                <span className="text-[10px] font-mono text-sage font-medium">{progressPercent}% complete</span>
              )}
            </div>

            {subtasks.length > 0 && (
              <div className="w-full h-1.5 bg-paper-3 dark:bg-ink rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              {subtasks.map(subtask => (
                <div
                  key={subtask.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-paper-3/40 dark:bg-ink/60 border border-line dark:border-line-ink text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => onToggleSubtaskComplete(subtask)}
                      disabled={isViewer}
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                        subtask.completed
                          ? 'bg-sage border-sage text-paper'
                          : 'border-sepia/40 hover:border-ember bg-paper-2 dark:bg-ink-2'
                      }`}
                    >
                      {subtask.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>
                    <span className={`truncate text-xs ${subtask.completed ? 'line-through text-sepia' : 'text-ink dark:text-paper'}`}>
                      {subtask.title}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteTask(subtask)}
                    disabled={isViewer}
                    className="p-1 text-sepia hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {!isViewer && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="New subtask... (Press Enter)"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={handleCreateSubtask}
                  className="w-full bg-paper-3/50 dark:bg-ink px-2.5 py-1.5 rounded-md border border-line dark:border-line-ink text-xs text-ink dark:text-paper placeholder:text-sepia-soft outline-none focus:border-ember"
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isViewer && (
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              onClick={() => onDeleteTask(task)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/25 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-ember hover:bg-ember-deep text-paper shadow-sm transition-all shadow-ember/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
