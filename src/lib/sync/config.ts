export type SyncRemoteMode = 'supabase' | 'api';

export function getSyncRemoteMode(env: ImportMetaEnv = import.meta.env): SyncRemoteMode {
  return env.VITE_SYNC_REMOTE_MODE === 'api' ? 'api' : 'supabase';
}
