export const SUPABASE_AUTH_CALLBACK_PATH = '/auth/callback';

export type AuthMode = 'supabase' | 'test';

function isLocalTestHost(hostname: string | undefined): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

export function isSupabaseConfigured(env: ImportMetaEnv = import.meta.env): boolean {
  return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
}

export function isTestAuthEnabled(
  env: ImportMetaEnv = import.meta.env,
  hostname = typeof window === 'undefined' ? '127.0.0.1' : window.location.hostname,
): boolean {
  return env.VITE_AUTH_TEST_MODE === 'true' || (!isSupabaseConfigured(env) && isLocalTestHost(hostname));
}

export function isAuthSyncEnabled(env: ImportMetaEnv = import.meta.env): boolean {
  return env.VITE_AUTH_SYNC_ENABLED === 'true';
}

export function getAuthMode(env: ImportMetaEnv = import.meta.env): AuthMode {
  return isSupabaseConfigured(env) ? 'supabase' : 'test';
}

export function getSupabaseConfig(env: ImportMetaEnv = import.meta.env) {
  if (!isSupabaseConfigured(env)) {
    return null;
  }

  return {
    url: env.VITE_SUPABASE_URL!,
    anonKey: env.VITE_SUPABASE_ANON_KEY!,
  };
}

export function getAuthCallbackUrl(origin?: string): string {
  const baseOrigin = origin ?? (typeof window === 'undefined' ? 'http://127.0.0.1:4173' : window.location.origin);
  return new URL(SUPABASE_AUTH_CALLBACK_PATH, baseOrigin).toString();
}
