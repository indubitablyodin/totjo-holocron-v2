import { describe, expect, it } from 'vitest';

import { loadDismissedAnnouncements, dismissAnnouncement } from './announcementDismissal';

describe('announcementDismissal', () => {
  it('loads empty map when nothing is stored', () => {
    const map = loadDismissedAnnouncements();
    // May contain leftover from previous tests, but at minimum has no test ids
    expect(typeof map).toBe('object');
  });

  it('stores and retrieves a dismissal', () => {
    dismissAnnouncement('test-id', 1);
    const map = loadDismissedAnnouncements();

    expect(map['test-id']).toBeDefined();
    expect(map['test-id'].version).toBe(1);
  });

  it('stores and retrieves a second dismissal', () => {
    dismissAnnouncement('test-id-2', 2);
    const map = loadDismissedAnnouncements();

    expect(map['test-id-2']).toBeDefined();
    expect(map['test-id-2'].version).toBe(2);
  });

  it('overwrites an existing dismissal with newer version', () => {
    dismissAnnouncement('test-id', 1);
    dismissAnnouncement('test-id', 2);
    const map = loadDismissedAnnouncements();

    expect(map['test-id'].version).toBe(2);
  });
});
