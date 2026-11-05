import React, { useState } from 'react';
import { X, Send, Copy, Check, Users, Link } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-md bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-2xl rounded-2xl overflow-hidden flex flex-col text-ink dark:text-paper transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line dark:border-line-ink flex items-center justify-between bg-paper-2 dark:bg-ink-2">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-ember" />
            <h2 className="text-sm font-semibold tracking-tight text-ink dark:text-paper">Collaborators & Permissions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-paper-3 dark:hover:bg-ink text-sepia hover:text-ink dark:hover:text-paper transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleSend} className="p-5 border-b border-line dark:border-line-ink space-y-3 bg-paper/40 dark:bg-ink/40">
          <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sepia">
            Invite New Collaborator
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1 px-3 py-2 bg-paper-2 dark:bg-ink-2 rounded-lg border border-line dark:border-line-ink text-xs outline-none focus:border-ember focus:ring-2 focus:ring-ember/20 text-ink dark:text-paper placeholder:text-sepia-soft"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'editor' | 'viewer')}
              className="px-3 py-2 bg-paper-2 dark:bg-ink-2 rounded-lg border border-line dark:border-line-ink text-xs outline-none focus:border-ember text-ink dark:text-paper font-medium"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={isSending}
              className="px-3.5 py-2 bg-ember hover:bg-ember-deep text-paper rounded-lg text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending...' : 'Invite'}</span>
            </button>
          </div>
        </form>

        {/* Generated Invite Link */}
        {inviteLink && (
          <div className="p-4 mx-5 mt-4 rounded-xl bg-sage/10 border border-sage/25 space-y-2">
            <div className="flex items-center justify-between text-xs text-sage dark:text-sage-soft font-medium">
              <span className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                Invite Link (Valid for 7 Days)
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-sage text-paper text-[11px] font-medium"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] font-mono text-ink-soft dark:text-paper-soft break-all bg-paper-2 dark:bg-ink-2 p-2 rounded border border-line dark:border-line-ink select-all">
              {inviteLink}
            </p>
          </div>
        )}

        {/* Existing Members */}
        <div className="p-5 space-y-2">
          <div className="text-[10px] font-mono font-semibold text-sepia uppercase tracking-wider">
            Current Project Members ({members.length})
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {members.map(member => (
              <div
                key={member.uid}
                className="flex items-center justify-between p-2.5 rounded-lg bg-paper-3/40 dark:bg-ink/60 border border-line dark:border-line-ink text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-full bg-paper-3 dark:bg-ink flex items-center justify-center text-[10px] font-mono text-sepia uppercase border border-line dark:border-line-ink">
                    {member.email.charAt(0)}
                  </div>
                  <span className="truncate text-xs font-medium text-ink dark:text-paper">{member.email}</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-medium ${
                    member.role === 'owner'
                      ? 'bg-gold/15 text-gold border border-gold/25'
                      : member.role === 'editor'
                      ? 'bg-ember/15 text-ember border border-ember/25'
                      : 'bg-sepia/15 text-sepia-soft border border-sepia/20'
                  }`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
