import { describe, expect, it } from 'vitest';

import { parseRemoteAnnouncementFeed, sanitizeAnnouncement, isValidAnnouncementAction, mergeAnnouncements } from './remoteAnnouncements';
import type { Announcement } from './announcementTypes';

const validEntry = {
  id: 'test-announcement',
  version: 1,
  kind: 'totjo',
  priority: 'normal',
  placement: 'badge',
  title: 'Test Title',
  body: 'Test body.',
  publishedAt: '2026-06-24T00:00:00.000Z',
  dismissible: true,
};

const validFeed = {
  schemaVersion: 1,
  updatedAt: '2026-06-24T00:00:00.000Z',
  announcements: [validEntry],
};

describe('sanitizeAnnouncement', () => {
  it('accepts a valid entry', () => {
    const result = sanitizeAnnouncement(validEntry);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-announcement');
  });

  it('rejects entry with missing id', () => {
    expect(sanitizeAnnouncement({ ...validEntry, id: '' })).toBeNull();
  });

  it('rejects entry with non-integer version', () => {
    expect(sanitizeAnnouncement({ ...validEntry, version: 0 })).toBeNull();
    expect(sanitizeAnnouncement({ ...validEntry, version: 1.5 })).toBeNull();
  });

  it('rejects entry with invalid kind', () => {
    expect(sanitizeAnnouncement({ ...validEntry, kind: 'invalid' })).toBeNull();
  });

  it('rejects entry with invalid priority', () => {
    expect(sanitizeAnnouncement({ ...validEntry, priority: 'invalid' })).toBeNull();
  });

  it('rejects entry with missing title', () => {
    expect(sanitizeAnnouncement({ ...validEntry, title: '' })).toBeNull();
  });

  it('rejects entry with missing publishedAt', () => {
    expect(sanitizeAnnouncement({ ...validEntry, publishedAt: 'not-a-date' })).toBeNull();
  });

  it('accepts entry with action', () => {
    const result = sanitizeAnnouncement({
      ...validEntry,
      action: { label: 'Read', href: '/library/sermons' },
    });
    expect(result).not.toBeNull();
    expect(result?.action?.label).toBe('Read');
    expect(result?.action?.href).toBe('/library/sermons');
  });
});

describe('isValidAnnouncementAction', () => {
  it('rejects javascript: href', () => {
    expect(isValidAnnouncementAction({ label: 'x', href: 'javascript:alert(1)' })).toBe(false);
  });

  it('rejects data: href', () => {
    expect(isValidAnnouncementAction({ label: 'x', href: 'data:text/html,...' })).toBe(false);
  });

  it('accepts internal path', () => {
    expect(isValidAnnouncementAction({ label: 'x', href: '/library/sermons' })).toBe(true);
  });

  it('accepts https URL', () => {
    expect(isValidAnnouncementAction({ label: 'x', href: 'https://totjo.org/announcement' })).toBe(true);
  });

  it('rejects http URL', () => {
    expect(isValidAnnouncementAction({ label: 'x', href: 'http://totjo.org/announcement' })).toBe(false);
  });
});

describe('parseRemoteAnnouncementFeed', () => {
  it('parses a valid feed', () => {
    const result = parseRemoteAnnouncementFeed(validFeed);
    expect(result).not.toBeNull();
    expect(result?.announcements).toHaveLength(1);
  });

  it('rejects feed with wrong schemaVersion', () => {
    expect(parseRemoteAnnouncementFeed({ ...validFeed, schemaVersion: 2 })).toBeNull();
  });

  it('rejects feed without announcements array', () => {
    expect(parseRemoteAnnouncementFeed({ schemaVersion: 1, updatedAt: '2026-01-01', announcements: 'not-array' })).toBeNull();
  });

  it('skips invalid entries in feed', () => {
    const feed = {
      schemaVersion: 1,
      updatedAt: '2026-06-24T00:00:00.000Z',
      announcements: [validEntry, { id: '' }, validEntry],
    };
    const result = parseRemoteAnnouncementFeed(feed);
    expect(result?.announcements).toHaveLength(2);
  });
});

describe('mergeAnnouncements', () => {
  const bundled: Announcement[] = [
    { id: 'a', version: 1, kind: 'app', priority: 'normal', placement: 'badge', title: 'A', body: '', publishedAt: '2026-06-01T00:00:00.000Z', dismissible: true },
    { id: 'b', version: 1, kind: 'app', priority: 'normal', placement: 'badge', title: 'B', body: '', publishedAt: '2026-06-01T00:00:00.000Z', dismissible: true },
  ];

  it('includes bundled announcements when remote has no matching ids', () => {
    const merged = mergeAnnouncements(bundled, []);
    expect(merged).toHaveLength(2);
  });

  it('remote higher version overrides bundled', () => {
    const remote = [{ ...bundled[0], version: 2, title: 'A Updated' }];
    const merged = mergeAnnouncements(bundled, remote);
    expect(merged.find((a) => a.id === 'a')?.title).toBe('A Updated');
    expect(merged.find((a) => a.id === 'a')?.version).toBe(2);
  });

  it('bundled version kept when remote has lower version', () => {
    const remote = [{ ...bundled[0], version: 0, title: 'A Stale' }];
    const merged = mergeAnnouncements(bundled, remote);
    expect(merged.find((a) => a.id === 'a')?.title).toBe('A');
  });
});
