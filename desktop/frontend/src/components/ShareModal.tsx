import React, { useState } from 'react';
import { X, Send, Copy, Check, Users, Trash2 } from 'lucide-react';
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

  // Mock members for display
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Share {project.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleSend} className="p-4 border-b border-border space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1 px-3 py-2 bg-muted/60 rounded-lg border border-border text-xs outline-none focus:border-primary/80 text-foreground"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'editor' | 'viewer')}
              className="px-2.5 py-2 bg-muted/60 rounded-lg border border-border text-xs outline-none focus:border-primary/80 text-foreground font-medium"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={isSending}
              className="px-3.5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3 h-3" />
              <span>Invite</span>
            </button>
          </div>

          {/* Generated Link Box */}
          {inviteLink && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between gap-2">
              <span className="truncate text-emerald-400 font-mono text-[11px]">{inviteLink}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </form>

        {/* Member List */}
        <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Project Members
          </span>
          <div className="space-y-1.5 pt-1">
            {members.map(m => (
              <div key={m.uid} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
                <span className="truncate font-medium text-foreground">{m.email}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-muted text-muted-foreground">
                    {m.role}
                  </span>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => setMembers(members.filter(x => x.uid !== m.uid))}
                      className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
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
