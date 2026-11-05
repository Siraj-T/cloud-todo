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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-2xl bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-2xl rounded-2xl overflow-hidden flex flex-col text-ink dark:text-paper transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line dark:border-line-ink bg-ember/10 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-ember/20 border border-ember/30 flex items-center justify-center text-ember shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink dark:text-paper">Version Conflict Detected</h2>
            <p className="text-xs text-sepia mt-0.5">
              Both your local device and a remote collaborator updated this task concurrently. Choose which version to preserve.
            </p>
          </div>
        </div>

        {/* Split Comparison Cards */}
        <div className="grid grid-cols-2 p-6 gap-5 bg-paper/50 dark:bg-ink/50">
          {/* Local Draft */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-ember">
              <Laptop className="w-4 h-4 text-ember" />
              <span>Local Device Draft</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-mono text-sepia uppercase">Title</span>
                <p className="font-semibold text-xs text-ink dark:text-paper mt-0.5">{localTask.title}</p>
              </div>
              {localTask.description && (
                <div>
                  <span className="text-[10px] font-mono text-sepia uppercase">Description</span>
                  <p className="text-ink-soft dark:text-paper-soft text-[11px] mt-0.5 line-clamp-3 leading-relaxed">
                    {localTask.description}
                  </p>
                </div>
              )}
              {localTask.dueDate && (
                <div>
                  <span className="text-[10px] font-mono text-sepia uppercase">Due Date</span>
                  <p className="text-ink-soft dark:text-paper-soft text-[11px] font-mono mt-0.5">{localTask.dueDate}</p>
                </div>
              )}
              {localTask.tags && localTask.tags.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-sepia uppercase">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {localTask.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-paper-3/60 dark:bg-ink border border-line dark:border-line-ink text-[10px] text-sepia font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onUseLocal}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-paper-3 dark:bg-ink hover:bg-ember hover:text-paper text-ink dark:text-paper text-xs font-medium border border-line dark:border-line-ink transition-all mt-auto shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Keep Local Version</span>
            </button>
          </div>

          {/* Cloud Version */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-sage dark:text-sage-soft">
              <Cloud className="w-4 h-4 text-sage" />
              <span>Cloud Server Version</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-mono text-sepia uppercase">Title</span>
                <p className="font-semibold text-xs text-ink dark:text-paper mt-0.5">{cloudTask.title}</p>
              </div>
              {cloudTask.description && (
                <div>
                  <span className="text-[10px] font-mono text-sepia uppercase">Description</span>
                  <p className="text-ink-soft dark:text-paper-soft text-[11px] mt-0.5 line-clamp-3 leading-relaxed">
                    {cloudTask.description}
                  </p>
                </div>
              )}
              {cloudTask.dueDate && (
                <div>
                  <span className="text-[10px] font-mono text-sepia uppercase">Due Date</span>
                  <p className="text-ink-soft dark:text-paper-soft text-[11px] font-mono mt-0.5">{cloudTask.dueDate}</p>
                </div>
              )}
              {cloudTask.tags && cloudTask.tags.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-sepia uppercase">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cloudTask.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-paper-3/60 dark:bg-ink border border-line dark:border-line-ink text-[10px] text-sepia font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onUseCloud}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-sage hover:bg-sage/90 text-paper text-xs font-medium border border-sage transition-all mt-auto shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept Cloud Version</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
