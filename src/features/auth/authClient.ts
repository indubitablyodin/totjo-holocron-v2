import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getAuthCallbackUrl, getAuthMode, isTestAuthEnabled, type AuthMode } from '@/lib/supabase/config';

import {
  clearPendingMagicLink,
  clearStoredAuthSession,
  loadPendingMagicLink,
  loadStoredAuthSession,
  savePendingMagicLink,
  saveStoredAuthSession,
} from './authStorage';

export type AuthUser = {
  id: string;
  email: string;
  mode: AuthMode;
};

export type MagicLinkRequestResult = {
  message: string;
  callbackUrl: string | null;
};

export type InitialAuthSnapshot = {
  status: 'loading' | 'signed_out' | 'signed_in';
  user: AuthUser | null;
};

export class AuthCallbackError extends Error {
  code: 'invalid-or-expired-link';

  constructor() {
    super('That sign-in link is invalid or has expired. You can keep using the app on this device and request a fresh link when you are ready.');
    this.code = 'invalid-or-expired-link';
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getWindowOrigin(): string {
  return typeof window === 'undefined' ? 'http://127.0.0.1:4173' : window.location.origin;
}

function createTestUserId(email: string): string {
  return `test-user:${normalizeEmail(email)}`;
}

function mapToAuthUser(user: { id: string; email?: string | null }, mode: AuthMode): AuthUser | null {
  if (!user.email) {
    return null;
  }

  return {
    id: user.id,
    email: normalizeEmail(user.email),
    mode,
  };
}

function createPendingMagicLink(email: string) {
  const requestedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const token = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    email: normalizeEmail(email),
    expiresAt,
    requestedAt,
    token,
  };
}

async function getSupabaseSession(): Promise<AuthUser | null> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.user ? mapToAuthUser(data.session.user, 'supabase') : null;
}

async function requestSupabaseMagicLink(email: string): Promise<MagicLinkRequestResult> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error('Supabase is not configured for this environment.');
  }

  const { error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      emailRedirectTo: getAuthCallbackUrl(getWindowOrigin()),
    },
  });

  if (error) {
    throw error;
  }

  return {
    message: 'Check your email for the sign-in link.',
    callbackUrl: null,
  };
}

async function consumeSupabaseCallback(url: URL): Promise<AuthUser> {
  const errorParam = url.searchParams.get('error');
  const code = url.searchParams.get('code');

  if (errorParam || !code) {
    throw new AuthCallbackError();
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new AuthCallbackError();
  }

  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error || !data.session?.user) {
    throw new AuthCallbackError();
  }

  const user = mapToAuthUser(data.session.user, 'supabase');

  if (!user) {
    throw new AuthCallbackError();
  }

  return user;
}

async function signOutOfSupabase() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return;
  }

  await client.auth.signOut();
}

async function getTestSession(): Promise<AuthUser | null> {
  const session = loadStoredAuthSession();

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    email: normalizeEmail(session.user.email),
    mode: 'test',
  };
}

async function requestTestMagicLink(email: string): Promise<MagicLinkRequestResult> {
  const pendingMagicLink = createPendingMagicLink(email);
  savePendingMagicLink(pendingMagicLink);

  const callbackUrl = new URL(getAuthCallbackUrl(getWindowOrigin()));
  callbackUrl.searchParams.set('mode', 'test');
  callbackUrl.searchParams.set('token', pendingMagicLink.token);
  callbackUrl.searchParams.set('email', pendingMagicLink.email);

  return {
    message: 'Your sign-in link is ready below. Use it to finish signing in on this device.',
    callbackUrl: callbackUrl.toString(),
  };
}

async function consumeTestCallback(url: URL): Promise<AuthUser> {
  const pendingMagicLink = loadPendingMagicLink();
  const token = url.searchParams.get('token');
  const email = normalizeEmail(url.searchParams.get('email') ?? '');

  if (!pendingMagicLink || !token || !email) {
    throw new AuthCallbackError();
  }

  if (
    pendingMagicLink.token !== token ||
    pendingMagicLink.email !== email ||
    Number.isNaN(Date.parse(pendingMagicLink.expiresAt)) ||
    Date.parse(pendingMagicLink.expiresAt) < Date.now()
  ) {
    clearPendingMagicLink();
    throw new AuthCallbackError();
  }

  const user = {
    id: createTestUserId(email),
    email,
    mode: 'test' as const,
  };

  saveStoredAuthSession({
    user: {
      id: user.id,
      email: user.email,
    },
    signedInAt: new Date().toISOString(),
  });
  clearPendingMagicLink();

  return user;
}

async function signOutOfTestMode() {
  clearStoredAuthSession();
  clearPendingMagicLink();
}

export function getInitialAuthSnapshot(): InitialAuthSnapshot {
  if (getAuthMode() !== 'test') {
    return {
      status: 'loading',
      user: null,
    };
  }

  const session = loadStoredAuthSession();

  if (!session) {
    return {
      status: 'signed_out',
      user: null,
    };
  }

  return {
    status: 'signed_in',
    user: {
      id: session.user.id,
      email: normalizeEmail(session.user.email),
      mode: 'test',
    },
  };
}

export type AuthClient = {
  mode: AuthMode;
  getSession: () => Promise<AuthUser | null>;
  requestMagicLink: (email: string) => Promise<MagicLinkRequestResult>;
  consumeCallback: (url: URL) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

export function createAuthClient(): AuthClient {
  const mode = getAuthMode();

  if (mode === 'supabase') {
    return {
      mode,
      getSession: getSupabaseSession,
      requestMagicLink: requestSupabaseMagicLink,
      consumeCallback: consumeSupabaseCallback,
      signOut: signOutOfSupabase,
    };
  }

  if (!isTestAuthEnabled()) {
    return {
      mode: 'test',
      getSession: async () => null,
      requestMagicLink: async () => {
        throw new Error('Passwordless sign-in is unavailable until Supabase is configured for this environment.');
      },
      consumeCallback: async () => {
        throw new AuthCallbackError();
      },
      signOut: async () => {
        clearStoredAuthSession();
        clearPendingMagicLink();
      },
    };
  }

  return {
    mode,
    getSession: getTestSession,
    requestMagicLink: requestTestMagicLink,
    consumeCallback: consumeTestCallback,
    signOut: signOutOfTestMode,
  };
}

export function getAuthErrorMessage(code: string | null): string | null {
  if (code === 'invalid-or-expired-link') {
    return 'That sign-in link is invalid or has expired. You can keep using the app on this device and request a fresh link when you are ready.';
  }

  return null;
}
