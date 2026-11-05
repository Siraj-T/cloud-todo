import React, { useState } from 'react';
import { X, Laptop, Smartphone, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DeviceSession } from '../types';

interface DevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceSession[];
  onRevokeDevice: (sessionId: string) => Promise<void>;
}

export const DevicesModal: React.FC<DevicesModalProps> = ({
  isOpen,
  onClose,
  devices,
  onRevokeDevice,
}) => {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRevoke = async (sessionId: string) => {
    if (confirm('Revoke cloud sync access for this device? It will be rejected from syncing on its next sync attempt.')) {
      setRevokingId(sessionId);
      try {
        await onRevokeDevice(sessionId);
      } finally {
        setRevokingId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-lg bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink shadow-2xl rounded-2xl overflow-hidden flex flex-col text-ink dark:text-paper transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line dark:border-line-ink flex items-center justify-between bg-paper-2 dark:bg-ink-2">
          <div className="flex items-center gap-2.5">
            <Laptop className="w-4 h-4 text-ember" />
            <h2 className="text-sm font-semibold tracking-tight text-ink dark:text-paper">Registered Device Sessions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-paper-3 dark:hover:bg-ink text-sepia hover:text-ink dark:hover:text-paper transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Table */}
        <div className="p-5 space-y-2.5 max-h-80 overflow-y-auto">
          {devices.map(device => (
            <div
              key={device.sessionId}
              className="flex items-center justify-between p-3.5 rounded-xl bg-paper-3/40 dark:bg-ink/60 border border-line dark:border-line-ink text-xs hover:border-ember/40 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-paper-2 dark:bg-ink-2 border border-line dark:border-line-ink flex items-center justify-center text-ember">
                  {device.platform === 'android' || device.platform === 'ios' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink dark:text-paper text-xs">{device.deviceName}</span>
                    {device.isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-sage/15 text-sage dark:text-sage-soft border border-sage/25 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Active Current
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-sepia mt-0.5 font-mono">
                    <span className="capitalize">{device.platform}</span> • {device.lastSeenAt}
                  </div>
                </div>
              </div>

              {!device.isCurrent && (
                <button
                  onClick={() => handleRevoke(device.sessionId)}
                  disabled={revokingId === device.sessionId}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/25 transition-all"
                >
                  {revokingId === device.sessionId ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          ))}

          {devices.length === 0 && (
            <div className="p-6 text-center text-xs text-sepia">No active devices registered</div>
          )}
        </div>

        {/* Notice */}
        <div className="px-5 py-3 bg-paper/60 dark:bg-ink-3 border-t border-line dark:border-line-ink text-xs text-sepia flex items-center gap-2.5 font-mono">
          <ShieldAlert className="w-4 h-4 shrink-0 text-ember" />
          <span>Device revocation denies remote sync access without deleting local offline data.</span>
        </div>
      </div>
    </div>
  );
};
