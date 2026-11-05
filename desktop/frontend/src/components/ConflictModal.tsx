import React from 'react';
import { AlertTriangle, Cloud, Laptop, Check } from 'lucide-react';
import { Task } from '../types';

interface ConflictModalProps {
  isOpen: boolean;
  localTask: Task;
  cloudTask: Task;
  onUseCloud: () => void;
  onUseLocal: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  localTask,
  cloudTask,
  onUseCloud,
  onUseLocal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border bg-rose-500/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">Resolve task conflict</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Both this device and the cloud version have concurrent modifications. Choose which version to keep.
            </p>
          </div>
        </div>

        {/* Split View */}
        <div className="grid grid-cols-2 divide-x divide-border p-5 gap-5">
          {/* Local Draft */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Laptop className="w-4 h-4 text-primary" />
              <span>This device (Local draft)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">Title:</span>
                <p className="font-semibold text-sm text-foreground mt-0.5">{localTask.title}</p>
              </div>
              {localTask.description && (
                <div>
                  <span className="text-muted-foreground font-medium">Description:</span>
                  <p className="text-foreground mt-0.5 line-clamp-3">{localTask.description}</p>
                </div>
              )}
              {localTask.dueDate && (
                <div>
                  <span className="text-muted-foreground font-medium">Due date:</span>
                  <p className="text-foreground mt-0.5 font-mono">{localTask.dueDate}</p>
                </div>
              )}
              {localTask.tags?.length > 0 && (
                <div>
                  <span className="text-muted-foreground font-medium">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {localTask.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onUseLocal}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors mt-auto"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Review local version</span>
            </button>
          </div>

          {/* Cloud Version */}
          <div className="flex flex-col gap-3 pl-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Cloud version (Remote server)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">Title:</span>
                <p className="font-semibold text-sm text-foreground mt-0.5">{cloudTask.title}</p>
              </div>
              {cloudTask.description && (
                <div>
                  <span className="text-muted-foreground font-medium">Description:</span>
                  <p className="text-foreground mt-0.5 line-clamp-3">{cloudTask.description}</p>
                </div>
              )}
              {cloudTask.dueDate && (
                <div>
                  <span className="text-muted-foreground font-medium">Due date:</span>
                  <p className="text-foreground mt-0.5 font-mono">{cloudTask.dueDate}</p>
                </div>
              )}
              {cloudTask.tags?.length > 0 && (
                <div>
                  <span className="text-muted-foreground font-medium">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cloudTask.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onUseCloud}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors mt-auto shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use cloud version</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
