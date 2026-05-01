import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  type AuthClient,
  createAuthClient,
  getInitialAuthSnapshot,
  type AuthUser,
  type MagicLinkRequestResult,
} from '@/features/auth/authClient';
import { clearPendingMagicLink, clearStoredAuthSession } from '@/features/auth/authStorage';
import { isAuthSyncEnabled, type AuthMode } from '@/lib/supabase/config';

type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

type AuthContextValue = {
  mode: AuthMode;
  status: AuthStatus;
  user: AuthUser | null;
  lastMagicLinkUrl: string | null;
  requestMagicLink: (email: string) => Promise<MagicLinkRequestResult>;
  consumeCallback: (url: URL) => Promise<void>;
  signOut: () => Promise<void>;
};

const authSyncEnabled = isAuthSyncEnabled();
const disabledAuthClient: AuthClient = {
  mode: 'test',
  getSession: async () => null,
  requestMagicLink: async () => {
    throw new Error('Account access is disabled in this local-only release.');
  },
  consumeCallback: async () => {
    throw new Error('Account access is disabled in this local-only release.');
  },
  signOut: async () => {
    clearStoredAuthSession();
    clearPendingMagicLink();
  },
};
const authClient = authSyncEnabled ? createAuthClient() : disabledAuthClient;
const initialAuthSnapshot = authSyncEnabled ? getInitialAuthSnapshot() : { status: 'signed_out' as const, user: null };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(initialAuthSnapshot.status);
  const [user, setUser] = useState<AuthUser | null>(initialAuthSnapshot.user);
  const [lastMagicLinkUrl, setLastMagicLinkUrl] = useState<string | null>(null);
  const authStateVersionRef = useRef(0);

  useEffect(() => {
    if (!authSyncEnabled) {
      return;
    }

    let cancelled = false;
    const requestVersion = authStateVersionRef.current;

    const loadSession = async () => {
      try {
        const nextUser = await authClient.getSession();

        if (cancelled || authStateVersionRef.current !== requestVersion) {
          return;
        }

        setUser(nextUser);
        setStatus(nextUser ? 'signed_in' : 'signed_out');
      } catch {
        if (cancelled || authStateVersionRef.current !== requestVersion) {
          return;
        }

        setUser(null);
        setStatus('signed_out');
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestMagicLink = useCallback(async (email: string) => {
    const result = await authClient.requestMagicLink(email);
    setLastMagicLinkUrl(result.callbackUrl);
    return result;
  }, []);

  const consumeCallback = useCallback(async (url: URL) => {
    authStateVersionRef.current += 1;
    setStatus('loading');
    try {
      const nextUser = await authClient.consumeCallback(url);
      setUser(nextUser);
      setLastMagicLinkUrl(null);
      setStatus('signed_in');
    } catch (error) {
      clearStoredAuthSession();
      clearPendingMagicLink();
      setUser(null);
      setLastMagicLinkUrl(null);
      setStatus('signed_out');
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
    setLastMagicLinkUrl(null);
    setStatus('signed_out');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: authClient.mode,
      status,
      user,
      lastMagicLinkUrl,
      requestMagicLink,
      consumeCallback,
      signOut,
    }),
    [consumeCallback, lastMagicLinkUrl, requestMagicLink, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
