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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#111215]/95 border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] rounded-2xl overflow-hidden flex flex-col text-zinc-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] bg-rose-500/[0.03] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Version Conflict Detected</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Both your device and a cloud collaborator edited this task concurrently. Choose which version to keep.
            </p>
          </div>
        </div>

        {/* Split Comparison Cards */}
        <div className="grid grid-cols-2 p-5 gap-4">
          {/* Local Draft */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.06)]">
            <div className="flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-300">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <span>This Device (Your Draft)</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Title</span>
                <p className="font-semibold text-xs text-white mt-0.5">{localTask.title}</p>
              </div>
              {localTask.description && (
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Description</span>
                  <p className="text-zinc-300 text-[11px] mt-0.5 line-clamp-3 leading-relaxed">{localTask.description}</p>
                </div>
              )}
              {localTask.dueDate && (
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Due Date</span>
                  <p className="text-zinc-300 text-[11px] font-mono mt-0.5">{localTask.dueDate}</p>
                </div>
              )}
              {localTask.tags?.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {localTask.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-zinc-300 font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onUseLocal}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium border border-white/10 transition-all mt-auto"
            >
              <Check className="w-3.5 h-3.5 text-indigo-400" />
              <span>Keep local version</span>
            </button>
          </div>

          {/* Cloud Version */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.06)]">
            <div className="flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud Version (Remote)</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Title</span>
                <p className="font-semibold text-xs text-white mt-0.5">{cloudTask.title}</p>
              </div>
              {cloudTask.description && (
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Description</span>
                  <p className="text-zinc-300 text-[11px] mt-0.5 line-clamp-3 leading-relaxed">{cloudTask.description}</p>
                </div>
              )}
              {cloudTask.dueDate && (
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Due Date</span>
                  <p className="text-zinc-300 text-[11px] font-mono mt-0.5">{cloudTask.dueDate}</p>
                </div>
              )}
              {cloudTask.tags?.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cloudTask.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-zinc-300 font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onUseCloud}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all mt-auto shadow-[0_1px_8px_rgba(99,102,241,0.3)]"
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
