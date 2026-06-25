import { describe, expect, it } from 'vitest';

import {
  isAnnouncementActive,
  isAnnouncementDismissed,
  getVisibleAnnouncements,
  selectPrimaryAnnouncement,
  type Announcement,
  type DismissedMap,
} from './announcementTypes';

const base: Announcement = {
  id: 'test-a',
  version: 1,
  kind: 'app',
  priority: 'normal',
  placement: 'banner',
  title: 'Test',
  body: 'Test body',
  publishedAt: '2026-06-01T00:00:00.000Z',
  dismissible: true,
};

describe('isAnnouncementActive', () => {
  it('returns true for a valid announcement', () => {
    expect(isAnnouncementActive(base, new Date('2026-06-15'))).toBe(true);
  });

  it('returns false for an expired announcement', () => {
    const expired = { ...base, expiresAt: '2026-06-10T00:00:00.000Z' };
    expect(isAnnouncementActive(expired, new Date('2026-06-15'))).toBe(false);
  });

  it('returns false for a future announcement', () => {
    const future = { ...base, startsAt: '2026-07-01T00:00:00.000Z' };
    expect(isAnnouncementActive(future, new Date('2026-06-15'))).toBe(false);
  });
});

describe('isAnnouncementDismissed', () => {
  it('returns true when dismissed at same version', () => {
    const map: DismissedMap = { 'test-a': { version: 1, dismissedAt: '2026-06-15T00:00:00.000Z' } };
    expect(isAnnouncementDismissed(base, map)).toBe(true);
  });

  it('returns false when not in dismissed map', () => {
    expect(isAnnouncementDismissed(base, {})).toBe(false);
  });

  it('returns false when dismissed at an older version', () => {
    const map: DismissedMap = { 'test-a': { version: 0, dismissedAt: '2026-06-15T00:00:00.000Z' } };
    expect(isAnnouncementDismissed({ ...base, version: 1 }, map)).toBe(false);
  });
});

describe('getVisibleAnnouncements', () => {
  it('filters expired and dismissed announcements', () => {
    const expired = { ...base, id: 'expired', expiresAt: '2026-06-10T00:00:00.000Z' };
    const dismissed = { ...base, id: 'dismissed' };
    const active = { ...base, id: 'active' };
    const map: DismissedMap = { dismissed: { version: 1, dismissedAt: '2026-06-15T00:00:00.000Z' } };

    const visible = getVisibleAnnouncements([expired, dismissed, active], map, new Date('2026-06-20'));

    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('active');
  });
});

describe('selectPrimaryAnnouncement', () => {
  it('returns null for empty list', () => {
    expect(selectPrimaryAnnouncement([])).toBeNull();
  });

  it('prefers urgent over normal', () => {
    const urgent: Announcement = {
      ...base, id: 'urgent', priority: 'urgent', publishedAt: '2026-06-01T00:00:00.000Z',
    };
    const normal: Announcement = {
      ...base, id: 'normal', priority: 'normal', publishedAt: '2026-06-15T00:00:00.000Z',
    };
    expect(selectPrimaryAnnouncement([normal, urgent])?.id).toBe('urgent');
  });

  it('prefers newer within same priority', () => {
    const older: Announcement = {
      ...base, id: 'older', priority: 'normal', publishedAt: '2026-06-01T00:00:00.000Z',
    };
    const newer: Announcement = {
      ...base, id: 'newer', priority: 'normal', publishedAt: '2026-06-15T00:00:00.000Z',
    };
    expect(selectPrimaryAnnouncement([older, newer])?.id).toBe('newer');
  });
});
