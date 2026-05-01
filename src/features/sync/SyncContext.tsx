import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { isAuthSyncEnabled } from '@/lib/supabase/config';
import {
  applyUserSyncProfile,
  createSyncRemoteClient,
  loadLocalUserSyncProfile,
  mergeUserSyncProfiles,
  type SyncStateStatus,
} from '@/lib/sync';

type SyncContextValue = {
  status: SyncStateStatus;
  errorMessage: string | null;
  lastSyncedAt: string | null;
  retrySync: () => Promise<void>;
};

const authSyncEnabled = isAuthSyncEnabled();
const syncClient = authSyncEnabled ? createSyncRemoteClient() : null;
const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [status, setStatus] = useState<SyncStateStatus>('local-only');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const lastAutoSyncKeyRef = useRef<string | null>(null);

  const runSync = useCallback(async () => {
    if (!authSyncEnabled || !syncClient || authStatus !== 'signed_in' || !user || isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setStatus('syncing');
    setErrorMessage(null);

    try {
      const localProfile = await loadLocalUserSyncProfile();
      const remoteProfile = await syncClient.loadProfile(user.id);
      const mergedProfile = mergeUserSyncProfiles(localProfile, remoteProfile);

      await syncClient.saveProfile(user.id, mergedProfile);
      await applyUserSyncProfile(mergedProfile);

      setStatus('synced');
      setLastSyncedAt(mergedProfile.meta.lastMergedAt);
      setErrorMessage(null);
    } catch (error) {
      setStatus('retry-needed');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reconcile local and remote state right now.');
    } finally {
      isSyncingRef.current = false;
    }
  }, [authStatus, user]);

  useEffect(() => {
    if (!authSyncEnabled) {
      lastAutoSyncKeyRef.current = null;
      return;
    }

    if (authStatus !== 'signed_in' || !user) {
      lastAutoSyncKeyRef.current = null;
      return;
    }

    const syncKey = `${user.id}:${authStatus}`;

    if (lastAutoSyncKeyRef.current === syncKey) {
      return;
    }

    lastAutoSyncKeyRef.current = syncKey;
    void runSync();
  }, [authStatus, runSync, user]);

  useEffect(() => {
    if (!authSyncEnabled) {
      return;
    }

    if (authStatus !== 'signed_in' || !user) {
      return;
    }

    const syncOnForeground = () => {
      void runSync();
    };

    window.addEventListener('focus', syncOnForeground);
    window.addEventListener('online', syncOnForeground);

    return () => {
      window.removeEventListener('focus', syncOnForeground);
      window.removeEventListener('online', syncOnForeground);
    };
  }, [authStatus, runSync, user]);

  const resolvedStatus: SyncStateStatus = authSyncEnabled && authStatus === 'signed_in' && user ? status : 'local-only';

  const value = useMemo<SyncContextValue>(
    () => ({
      status: resolvedStatus,
      errorMessage: authSyncEnabled && authStatus === 'signed_in' && user ? errorMessage : null,
      lastSyncedAt: authSyncEnabled && authStatus === 'signed_in' && user ? lastSyncedAt : null,
      retrySync: runSync,
    }),
    [authStatus, errorMessage, lastSyncedAt, resolvedStatus, runSync, user],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSync() {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }

  return context;
}
