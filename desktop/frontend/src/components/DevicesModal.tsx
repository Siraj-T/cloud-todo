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
    if (confirm('Are you sure you want to revoke cloud access for this device? It will stop syncing on its next contact.')) {
      setRevokingId(sessionId);
      try {
        await onRevokeDevice(sessionId);
      } finally {
        setRevokingId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Laptop className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Signed-in Devices</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Table */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {devices.map(device => (
            <div
              key={device.sessionId}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
                  {device.platform === 'android' || device.platform === 'ios' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{device.deviceName}</span>
                    {device.isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        This device
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Platform: <span className="capitalize">{device.platform}</span> • Last contact: {device.lastSeenAt}
                  </div>
                </div>
              </div>

              {!device.isCurrent && (
                <button
                  onClick={() => handleRevoke(device.sessionId)}
                  disabled={revokingId === device.sessionId}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                >
                  {revokingId === device.sessionId ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          ))}

          {devices.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">No active device sessions registered</div>
          )}
        </div>

        {/* Notice */}
        <div className="p-3 bg-muted/30 border-t border-border text-[11px] text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-muted-foreground/80" />
          <span>Revocation stops cloud access immediately without wiping local offline data.</span>
        </div>
      </div>
    </div>
  );
};
