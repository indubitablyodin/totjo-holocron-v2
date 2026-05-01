const AUTH_SESSION_STORAGE_KEY = 'totjo-holocron:auth-session';
const AUTH_PENDING_MAGIC_LINK_STORAGE_KEY = 'totjo-holocron:pending-magic-link';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const fallbackStorageState = new Map<string, string>();

const fallbackStorage: StorageLike = {
  getItem: (key) => fallbackStorageState.get(key) ?? null,
  setItem: (key, value) => {
    fallbackStorageState.set(key, value);
  },
  removeItem: (key) => {
    fallbackStorageState.delete(key);
  },
};

function getStorage(): StorageLike {
  if (typeof window === 'undefined') {
    return fallbackStorage;
  }

  const candidate = window.localStorage as Partial<Storage> | undefined;

  if (
    candidate &&
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  ) {
    return candidate as StorageLike;
  }

  return fallbackStorage;
}

function readStoredValue<T>(key: string): T | null {
  const rawValue = getStorage().getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function isStoredAuthSession(value: unknown): value is StoredAuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<StoredAuthSession>;
  return Boolean(
    session.user &&
      typeof session.user.id === 'string' &&
      typeof session.user.email === 'string' &&
      typeof session.signedInAt === 'string',
  );
}

function isPendingMagicLink(value: unknown): value is PendingMagicLink {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<PendingMagicLink>;
  return Boolean(
    typeof record.email === 'string' &&
      typeof record.token === 'string' &&
      typeof record.expiresAt === 'string' &&
      typeof record.requestedAt === 'string',
  );
}

export type StoredAuthSession = {
  user: {
    id: string;
    email: string;
  };
  signedInAt: string;
};

export type PendingMagicLink = {
  email: string;
  token: string;
  expiresAt: string;
  requestedAt: string;
};

export function loadStoredAuthSession(): StoredAuthSession | null {
  const session = readStoredValue<StoredAuthSession>(AUTH_SESSION_STORAGE_KEY);

  if (!isStoredAuthSession(session)) {
    clearStoredAuthSession();
    return null;
  }

  return session;
}

export function saveStoredAuthSession(session: StoredAuthSession) {
  getStorage().setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  getStorage().removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function loadPendingMagicLink(): PendingMagicLink | null {
  const pendingMagicLink = readStoredValue<PendingMagicLink>(AUTH_PENDING_MAGIC_LINK_STORAGE_KEY);

  if (!isPendingMagicLink(pendingMagicLink)) {
    clearPendingMagicLink();
    return null;
  }

  return pendingMagicLink;
}

export function savePendingMagicLink(record: PendingMagicLink) {
  getStorage().setItem(AUTH_PENDING_MAGIC_LINK_STORAGE_KEY, JSON.stringify(record));
}

export function clearPendingMagicLink() {
  getStorage().removeItem(AUTH_PENDING_MAGIC_LINK_STORAGE_KEY);
}

export function clearAuthStorageForTests() {
  clearStoredAuthSession();
  clearPendingMagicLink();
}

export function writeRawAuthStorageForTests(key: 'session' | 'pending', value: string) {
  const storageKey = key === 'session' ? AUTH_SESSION_STORAGE_KEY : AUTH_PENDING_MAGIC_LINK_STORAGE_KEY;
  getStorage().setItem(storageKey, value);
}
