import type { Announcement, AnnouncementAction, AnnouncementKind, AnnouncementPlacement, AnnouncementPriority } from './announcementTypes';

const VALID_KINDS: AnnouncementKind[] = ['totjo', 'sermon', 'doctrine', 'event', 'app', 'practice'];
const VALID_PRIORITIES: AnnouncementPriority[] = ['low', 'normal', 'high', 'urgent'];
const VALID_PLACEMENTS: AnnouncementPlacement[] = ['badge', 'banner', 'modal', 'card'];

export type RemoteAnnouncementFeed = {
  schemaVersion: number;
  updatedAt: string;
  announcements: Announcement[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isSafeHref(href: unknown): boolean {
  if (typeof href !== 'string') {
    return false;
  }

  // Allow internal paths starting with /
  if (href.startsWith('/')) {
    return true;
  }

  // Allow https URLs
  try {
    const url = new URL(href);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function isValidAnnouncementAction(action: unknown): action is AnnouncementAction {
  if (!action || typeof action !== 'object') {
    return false;
  }

  const record = action as Record<string, unknown>;

  return isNonEmptyString(record.label) && isSafeHref(record.href);
}

export function sanitizeAnnouncement(raw: unknown): Announcement | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (!isNonEmptyString(record.id)) {
    return null;
  }

  if (!isPositiveInteger(record.version)) {
    return null;
  }

  if (!VALID_KINDS.includes(record.kind as AnnouncementKind)) {
    return null;
  }

  if (!VALID_PRIORITIES.includes(record.priority as AnnouncementPriority)) {
    return null;
  }

  if (!VALID_PLACEMENTS.includes(record.placement as AnnouncementPlacement)) {
    return null;
  }

  if (!isNonEmptyString(record.title)) {
    return null;
  }

  if (typeof record.body !== 'string') {
    return null;
  }

  if (!isValidDateString(record.publishedAt)) {
    return null;
  }

  const action = record.action !== undefined ? sanitizeAnnouncementAction(record.action) : undefined;

  const expiresAt = typeof record.expiresAt === 'string' && isValidDateString(record.expiresAt) ? record.expiresAt : undefined;
  const startsAt = typeof record.startsAt === 'string' && isValidDateString(record.startsAt) ? record.startsAt : undefined;
  const dismissible = typeof record.dismissible === 'boolean' ? record.dismissible : true;

  return {
    id: record.id,
    version: record.version,
    kind: record.kind as AnnouncementKind,
    priority: record.priority as AnnouncementPriority,
    placement: record.placement as AnnouncementPlacement,
    title: record.title,
    body: record.body,
    action,
    publishedAt: record.publishedAt,
    expiresAt,
    startsAt,
    dismissible,
  };
}

function sanitizeAnnouncementAction(raw: unknown): AnnouncementAction | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const record = raw as Record<string, unknown>;

  if (!isNonEmptyString(record.label)) {
    return undefined;
  }

  if (!isSafeHref(record.href)) {
    return undefined;
  }

  return {
    label: record.label as string,
    href: record.href as string,
    external: record.external === true,
  };
}

export function parseRemoteAnnouncementFeed(value: unknown): RemoteAnnouncementFeed | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    return null;
  }

  if (!isNonEmptyString(record.updatedAt)) {
    return null;
  }

  if (!Array.isArray(record.announcements)) {
    return null;
  }

  const announcements: Announcement[] = [];

  for (const entry of record.announcements) {
    const sanitized = sanitizeAnnouncement(entry);

    if (sanitized) {
      announcements.push(sanitized);
    }
  }

  return {
      schemaVersion: 1,
      updatedAt: record.updatedAt as string,
      announcements,
  };
}

export function mergeAnnouncements(
  bundled: Announcement[],
  remote: Announcement[],
): Announcement[] {
  const merged = new Map<string, Announcement>();

  for (const a of bundled) {
    merged.set(a.id, a);
  }

  for (const a of remote) {
    const existing = merged.get(a.id);

    if (!existing || a.version > existing.version || (a.version === existing.version && a.publishedAt > existing.publishedAt)) {
      merged.set(a.id, a);
    }
  }

  return [...merged.values()];
}
