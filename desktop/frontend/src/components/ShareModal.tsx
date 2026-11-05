import React, { useState } from 'react';
import { X, Send, Copy, Check, Users, Trash2, Link } from 'lucide-react';
import { Project } from '../types';

interface Member {
  uid: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface ShareModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSendInvite: (email: string, role: string) => Promise<string>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  project,
  onClose,
  onSendInvite,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [members, setMembers] = useState<Member[]>([
    { uid: 'owner-1', email: 'you@example.com', role: 'owner' },
  ]);

  if (!isOpen || !project) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSending(true);
    try {
      const link = await onSendInvite(email.trim(), role);
      setInviteLink(link);
      setMembers([...members, { uid: `user-${Date.now()}`, email: email.trim(), role }]);
      setEmail('');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#111215]/95 border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] rounded-2xl overflow-hidden flex flex-col text-zinc-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-semibold text-white tracking-tight">Share & Collaborators</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleSend} className="p-4 border-b border-white/[0.06] space-y-3 bg-white/[0.01]">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1 px-3 py-1.5 bg-[#18191e] rounded-lg border border-white/[0.08] text-xs outline-none focus:border-indigo-500/50 text-white placeholder:text-zinc-500"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'editor' | 'viewer')}
              className="px-2 py-1.5 bg-[#18191e] rounded-lg border border-white/[0.08] text-xs outline-none focus:border-indigo-500/50 text-zinc-300 font-medium"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={isSending}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all shadow-[0_1px_8px_rgba(99,102,241,0.3)] flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3 h-3" />
              <span>Invite</span>
            </button>
          </div>

          {/* Generated Link Box */}
          {inviteLink && (
            <div className="p-2.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/25 text-xs flex items-center justify-between gap-2 shadow-[0_0_12px_rgba(52,211,153,0.1)]">
              <div className="flex items-center gap-2 truncate">
                <Link className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate text-emerald-300 font-mono text-[10px]">{inviteLink}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </form>

        {/* Member List */}
        <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
            Project Members
          </span>
          <div className="space-y-1.5 pt-1">
            {members.map(m => (
              <div key={m.uid} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs">
                <span className="truncate font-medium text-zinc-300 text-[11px]">{m.email}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                    m.role === 'owner'
                      ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                      : m.role === 'editor'
                      ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                  }`}>
                    {m.role}
                  </span>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => setMembers(members.filter(x => x.uid !== m.uid))}
                      className="p-1 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
