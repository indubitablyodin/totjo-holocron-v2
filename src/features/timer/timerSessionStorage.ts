import { loadTimerPreferences } from '@/features/timer/timerPreferences';

import {
  createDefaultTimerSession,
  hydrateStoredTimerSession,
  type TimerSessionState,
} from './timerModel';

export const TIMER_SESSION_STORAGE_KEY = 'totjo-holocron:timer-session';

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

export function loadTimerSession(now = Date.now()): TimerSessionState {
  const preferences = loadTimerPreferences();
  const rawValue = getStorage().getItem(TIMER_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return createDefaultTimerSession(preferences);
  }

  try {
    return hydrateStoredTimerSession(JSON.parse(rawValue), preferences, now);
  } catch {
    return createDefaultTimerSession(preferences);
  }
}

export function saveTimerSession(session: TimerSessionState) {
  getStorage().setItem(TIMER_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearTimerSessionStorage() {
  getStorage().removeItem(TIMER_SESSION_STORAGE_KEY);
}
