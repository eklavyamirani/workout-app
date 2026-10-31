import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { isAuthenticated } from '../storage/auth';

type SyncState = 'idle' | 'synced' | 'syncing' | 'offline' | 'error';

export function SyncStatus() {
  const [state, setState] = useState<SyncState>(navigator.onLine ? 'idle' : 'offline');

  useEffect(() => {
    if (!isAuthenticated()) return;

    let syncedTimer: ReturnType<typeof setTimeout> | null = null;

    const onStart = () => {
      if (syncedTimer) clearTimeout(syncedTimer);
      setState('syncing');
    };

    const onComplete = () => {
      setState('synced');
      syncedTimer = setTimeout(() => setState('idle'), 3000);
    };

    const onError = () => {
      setState('error');
      syncedTimer = setTimeout(() => setState('idle'), 5000);
    };

    const onOnline = () => setState('idle');
    const onOffline = () => setState('offline');

    window.addEventListener('sync:start', onStart);
    window.addEventListener('sync:complete', onComplete);
    window.addEventListener('sync:error', onError);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      if (syncedTimer) clearTimeout(syncedTimer);
      window.removeEventListener('sync:start', onStart);
      window.removeEventListener('sync:complete', onComplete);
      window.removeEventListener('sync:error', onError);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!isAuthenticated()) return null;

  const config: Record<SyncState, { icon: React.ReactNode; label: string; className: string }> = {
    idle: {
      icon: <Cloud className="w-3.5 h-3.5" />,
      label: 'Connected',
      className: 'text-gray-400',
    },
    synced: {
      icon: <Check className="w-3.5 h-3.5" />,
      label: 'Synced',
      className: 'text-green-500',
    },
    syncing: {
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
      label: 'Syncing',
      className: 'text-blue-500',
    },
    offline: {
      icon: <CloudOff className="w-3.5 h-3.5" />,
      label: 'Offline',
      className: 'text-gray-400',
    },
    error: {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: 'Sync error',
      className: 'text-red-400',
    },
  };

  const { icon, label, className } = config[state];

  return (
    <div
      className={`flex items-center gap-1 text-xs ${className}`}
      data-testid="sync-status"
      data-sync-state={state}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
