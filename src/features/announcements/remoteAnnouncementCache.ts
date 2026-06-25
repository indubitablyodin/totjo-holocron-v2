import type { Announcement } from './announcementTypes';

const CACHE_KEY = 'totjo-holocron:remote-announcements-cache';

type AnnouncementCache = {
  lastFetchedAt: string;
  feedUpdatedAt: string;
  announcements: Announcement[];
};

export function loadCachedRemoteAnnouncements(): Announcement[] {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);

    if (!raw) {
      return [];
    }

    const cache = JSON.parse(raw) as AnnouncementCache;

    return cache.announcements ?? [];
  } catch {
    return [];
  }
}

export function cacheRemoteAnnouncements(feedUpdatedAt: string, announcements: Announcement[]): void {
  const cache: AnnouncementCache = {
    lastFetchedAt: new Date().toISOString(),
    feedUpdatedAt,
    announcements,
  };

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache unavailable — best-effort.
  }
}
