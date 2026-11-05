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
      <div className="w-96 border-l border-border bg-card/20 flex items-center justify-center p-6 text-sm text-muted-foreground italic select-none">
        Select a task to view details
      </div>
    );
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const trimmed = newTag.trim().toLowerCase();
      if (tags.length >= 20) {
        setFieldError('Maximum of 20 tags allowed');
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

  return (
    <div className="w-96 border-l border-border bg-card/40 flex flex-col h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          Task details
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isViewer && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Viewer role: Editing controls disabled</span>
        </div>
      )}

      {/* Detail Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {fieldError && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fieldError}</span>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <input
            type="text"
            disabled={isViewer}
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              setFieldError(null);
            }}
            maxLength={200}
            className="w-full px-3 py-2 bg-card rounded-lg border border-border text-sm font-medium outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 text-foreground"
          />
          <div className="text-[10px] text-right text-muted-foreground font-mono">{title.length}/200</div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea
            disabled={isViewer}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={10000}
            rows={4}
            placeholder="Add notes or detailed instructions..."
            className="w-full px-3 py-2 bg-card rounded-lg border border-border text-sm outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 text-foreground resize-none"
          />
          <div className="text-[10px] text-right text-muted-foreground font-mono">{description.length}/10,000</div>
        </div>

        {/* Due Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Due date (YYYY-MM-DD)
          </label>
          <input
            type="date"
            disabled={isViewer}
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 bg-card rounded-lg border border-border text-sm outline-none focus:border-primary/80 text-foreground font-mono"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Tags (max 20)
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-muted text-foreground border border-border/80"
              >
                <span>{tag}</span>
                {!isViewer && (
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {!isViewer && (
            <input
              type="text"
              placeholder="Add tag and press Enter..."
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full px-3 py-1.5 bg-card rounded-lg border border-border text-xs outline-none focus:border-primary/80 text-foreground"
            />
          )}
        </div>

        {/* Subtasks Section (Allowed for Root Tasks only per US-03) */}
        {!isSubtask && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Subtasks ({subtasks.filter(s => s.completed).length}/{subtasks.length})
              </label>
            </div>

            <div className="space-y-1.5">
              {subtasks.map(st => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-card/60 border border-border/50 text-xs"
                >
                  <button
                    onClick={() => onToggleSubtaskComplete(st)}
                    disabled={isViewer}
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      st.completed
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/40 hover:border-primary'
                    }`}
                  >
                    {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                  <span className={`truncate flex-1 ${st.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {st.title}
                  </span>
                </div>
              ))}

              {!isViewer && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Add subtask... (Press Enter)"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleCreateSubtask}
                    className="w-full bg-transparent text-xs placeholder:text-muted-foreground/70 outline-none text-foreground py-1"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!isViewer && (
        <div className="p-3 border-t border-border bg-card/60 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => onDeleteTask(task)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Save changes
          </button>
        </div>
      )}
    </div>
  );
};
