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
    if (confirm('Revoke cloud access for this device? It will be blocked from syncing on its next contact.')) {
      setRevokingId(sessionId);
      try {
        await onRevokeDevice(sessionId);
      } finally {
        setRevokingId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#111215]/95 border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] rounded-2xl overflow-hidden flex flex-col text-zinc-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-semibold text-white tracking-tight">Signed-in Devices</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Device Table */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {devices.map(device => (
            <div
              key={device.sessionId}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-400">
                  {device.platform === 'android' || device.platform === 'ios' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">{device.deviceName}</span>
                    {device.isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        This device
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                    <span className="capitalize">{device.platform}</span> • {device.lastSeenAt}
                  </div>
                </div>
              </div>

              {!device.isCurrent && (
                <button
                  onClick={() => handleRevoke(device.sessionId)}
                  disabled={revokingId === device.sessionId}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                >
                  {revokingId === device.sessionId ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          ))}

          {devices.length === 0 && (
            <div className="p-6 text-center text-xs text-zinc-600">No active devices registered</div>
          )}
        </div>

        {/* Notice */}
        <div className="px-4 py-2.5 bg-white/[0.01] border-t border-white/[0.06] text-[10px] text-zinc-500 flex items-center gap-2 font-mono">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
          <span>Revocation denies cloud access without wiping local offline data.</span>
        </div>
      </div>
    </div>
  );
};
