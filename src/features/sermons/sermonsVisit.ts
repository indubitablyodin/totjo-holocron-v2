import type { SermonDocumentRecord } from './types';

export const SERMONS_LAST_VISITED_STORAGE_KEY = 'totjo-holocron:sermons-last-visited-at';

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

export function loadSermonsLastVisitedAt(): string | null {
  return getStorage().getItem(SERMONS_LAST_VISITED_STORAGE_KEY);
}

export function markSermonsVisitedNow(now: Date = new Date()): void {
  getStorage().setItem(SERMONS_LAST_VISITED_STORAGE_KEY, now.toISOString());
}

export function clearSermonsVisitStorage(): void {
  getStorage().removeItem(SERMONS_LAST_VISITED_STORAGE_KEY);
}

/**
 * A never-visited device treats every sermon as new; otherwise only sermons
 * published after the last recorded visit count.
 */
export function countNewSermons(sermons: SermonDocumentRecord[], lastVisitedAt: string | null): number {
  if (!lastVisitedAt) {
    return sermons.length;
  }

  return sermons.filter((sermon) => Boolean(sermon.publishedAt) && sermon.publishedAt! > lastVisitedAt).length;
}
