import { beforeEach, describe, expect, it } from 'vitest';

import type { DocumentRecord, DocumentSource, DownloadRecord } from '@/lib/content';

import {
  clearDailyQuickAccessMiddleSlot,
  createDailyQuickAccessChoices,
  loadDailyQuickAccessMiddleSlotId,
  saveDailyQuickAccessMiddleSlot,
} from './dailyQuickAccess';

const source: DocumentSource = {
  sourceType: 'test',
  sourceUrls: [],
  attribution: 'Temple of the Jedi Order',
  approvalStatus: 'approved',
  provenanceStatus: 'recorded',
};

function createDocument(overrides: Partial<DocumentRecord> & Pick<DocumentRecord, 'id' | 'slug' | 'title' | 'authorityClass'>): DocumentRecord {
  return {
    summary: '',
    documentType: overrides.authorityClass === 'sermon' ? 'sermon' : 'study-text',
    sourceId: overrides.authorityClass === 'sermon' ? 'totjo-sermons' : 'test-source',
    bodyMarkdown: 'Body',
    tags: [],
    version: 1,
    checksum: `${overrides.id}:checksum`,
    origin: 'bundled',
    source,
    sourceUrl: null,
    author: null,
    sortOrder: 0,
    publishedAt: null,
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function createDownload(overrides: Pick<DownloadRecord, 'id' | 'documentId' | 'status'>): DownloadRecord {
  return {
    storedChecksum: `${overrides.documentId}:checksum`,
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  clearDailyQuickAccessMiddleSlot();
});

describe('daily quick access middle slot', () => {
  it('builds choices from canonical docs, supplemental docs, and ready saved sermons only', () => {
    const choices = createDailyQuickAccessChoices(
      [
        createDocument({ authorityClass: 'supplemental', id: 'supplemental-knights-code', slug: 'knights-code', title: "Knight's Code" }),
        createDocument({ authorityClass: 'canonical', id: 'canon-three-tenets', slug: 'three-tenets', title: 'The Three Tenets' }),
        createDocument({ authorityClass: 'sermon', id: 'sermon-ready', slug: 'saved-sermon', title: 'Saved Sermon' }),
        createDocument({ authorityClass: 'sermon', id: 'sermon-failed', slug: 'failed-sermon', title: 'Failed Sermon' }),
        createDocument({ authorityClass: 'sermon', id: 'sermon-other-ready', slug: 'other-ready-sermon', title: 'Other Ready Sermon' }),
      ],
      [
        createDownload({ documentId: 'sermon-ready', id: 'sermon-download:sermon-ready', status: 'ready' }),
        createDownload({ documentId: 'sermon-failed', id: 'sermon-download:sermon-failed', status: 'failed' }),
        createDownload({ documentId: 'sermon-other-ready', id: 'other-download:sermon-other-ready', status: 'ready' }),
      ],
    );

    expect(choices).toEqual([
      {
        href: '/library/supplemental/knights-code',
        id: 'document:supplemental-knights-code',
        title: "Knight's Code",
      },
      {
        href: '/library/sermons/saved-sermon',
        id: 'document:sermon-ready',
        title: 'Saved Sermon',
      },
      {
        href: '/library/doctrine/three-tenets',
        id: 'document:canon-three-tenets',
        title: 'The Three Tenets',
      },
    ]);
  });

  it('persists the middle slot locally and clears back to the default slot', () => {
    saveDailyQuickAccessMiddleSlot('document:canon-three-tenets');

    expect(loadDailyQuickAccessMiddleSlotId()).toBe('document:canon-three-tenets');

    saveDailyQuickAccessMiddleSlot(null);

    expect(loadDailyQuickAccessMiddleSlotId()).toBe('');
  });
});
