import { beforeEach, describe, expect, it } from 'vitest';

import type { DocumentSource } from '@/lib/content';

import { clearSermonsVisitStorage, countNewSermons, loadSermonsLastVisitedAt, markSermonsVisitedNow } from './sermonsVisit';
import type { SermonDocumentRecord } from './types';

const source: DocumentSource = {
  sourceType: 'test',
  sourceUrls: [],
  attribution: 'Temple of the Jedi Order',
  approvalStatus: 'approved',
  provenanceStatus: 'recorded',
};

function createSermon(id: string, publishedAt: string | null): SermonDocumentRecord {
  return {
    id,
    slug: id,
    title: id,
    summary: '',
    authorityClass: 'sermon',
    documentType: 'sermon',
    sourceId: 'totjo-sermons',
    bodyMarkdown: 'Body',
    tags: [],
    version: 1,
    checksum: `${id}:checksum`,
    origin: 'bundled',
    source,
    sourceUrl: null,
    author: null,
    sortOrder: 0,
    publishedAt,
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  clearSermonsVisitStorage();
});

describe('sermons last-visited tracking', () => {
  it('treats every sermon as new when the device has never visited sermons', () => {
    const sermons = [createSermon('a', '2026-08-01T00:00:00.000Z'), createSermon('b', '2026-07-01T00:00:00.000Z')];

    expect(loadSermonsLastVisitedAt()).toBeNull();
    expect(countNewSermons(sermons, loadSermonsLastVisitedAt())).toBe(2);
  });

  it('counts only sermons published after the last visit', () => {
    markSermonsVisitedNow(new Date('2026-08-01T00:00:00.000Z'));

    const sermons = [
      createSermon('older', '2026-07-01T00:00:00.000Z'),
      createSermon('newer', '2026-08-15T00:00:00.000Z'),
      createSermon('undated', null),
    ];

    expect(countNewSermons(sermons, loadSermonsLastVisitedAt())).toBe(1);
  });

  it('persists the visit timestamp across loads', () => {
    const now = new Date('2026-09-01T12:00:00.000Z');
    markSermonsVisitedNow(now);

    expect(loadSermonsLastVisitedAt()).toBe(now.toISOString());
  });
});
