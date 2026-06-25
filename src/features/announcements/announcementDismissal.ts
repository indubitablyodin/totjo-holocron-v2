import type { DismissedMap } from './announcementTypes';

const STORAGE_KEY = 'totjo-holocron:dismissed-announcements';

const fallbackMap = new Map<string, string>();

export function clearDismissedAnnouncements(): void {
  fallbackMap.delete(STORAGE_KEY);
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort.
  }
}

export function dismissAnnouncement(id: string, version: number): void {
  const raw = readRaw();
  const map: DismissedMap = raw ? JSON.parse(raw) : {};
  map[id] = { version, dismissedAt: new Date().toISOString() };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    fallbackMap.set(STORAGE_KEY, JSON.stringify(map));
  }
}

function readRaw(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value !== null) {
      return value;
    }
  } catch {
    // Fall through to fallback.
  }

  return fallbackMap.get(STORAGE_KEY) ?? null;
}

export function loadDismissedAnnouncements(): DismissedMap {
  const raw = readRaw();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as DismissedMap;
  } catch {
    return {};
  }
}
