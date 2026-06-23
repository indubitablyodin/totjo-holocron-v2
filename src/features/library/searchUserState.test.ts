import { describe, expect, it } from 'vitest';

import type { HolocronDocument } from '@/content/contentTypes';
import type { BookmarkRecord, NoteRecord } from '@/lib/content';
import { searchBookmarks, searchNotes, combineUserStateResults } from './searchUserState';

const makeDoc = (overrides: Partial<HolocronDocument>): HolocronDocument => ({
  id: 'doc-1',
  slug: 'doc-1',
  title: 'Test Document',
  authorityClass: 'doctrine',
  summary: 'A test document summary.',
  tags: [],
  sections: [{ id: 's1', bodyMarkdown: 'Body text.', order: 1 }],
  ...overrides,
});

const makeBookmark = (overrides: Partial<BookmarkRecord>): BookmarkRecord => ({
  id: 'bm-1',
  documentId: 'doc-1',
  anchor: '',
  label: 'My bookmark label',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

const makeNote = (overrides: Partial<NoteRecord>): NoteRecord => ({
  id: 'note-1',
  documentId: 'doc-1',
  anchor: null,
  bodyMarkdown: 'My personal note text.',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

describe('searchBookmarks', () => {
  it('returns a HolocronSearchResult when matching', () => {
    const doc = makeDoc({});
    const bookmark = makeBookmark({});
    const map = new Map([['doc-1', doc]]);

    const results = searchBookmarks({ bookmarks: [bookmark], documentMap: map, query: 'bookmark', enabled: true });

    expect(results).toHaveLength(1);
    expect(results[0].scope).toBe('bookmark');
    expect(results[0].scopeLabel).toBe('Bookmark');
    expect(results[0].href).toBe('/library/doctrine/doc-1');
  });

  it('skips bookmarks for missing documents', () => {
    const bookmark = makeBookmark({ documentId: 'missing-doc' });
    const map = new Map<string, HolocronDocument>();

    const results = searchBookmarks({ bookmarks: [bookmark], documentMap: map, query: 'bookmark', enabled: true });

    expect(results).toHaveLength(0);
  });

  it('returns empty when disabled', () => {
    const results = searchBookmarks({ bookmarks: [], documentMap: new Map(), query: 'test', enabled: false });

    expect(results).toEqual([]);
  });
});

describe('searchNotes', () => {
  it('returns a HolocronSearchResult when matching', () => {
    const doc = makeDoc({});
    const note = makeNote({});
    const map = new Map([['doc-1', doc]]);

    const results = searchNotes({ notes: [note], documentMap: map, query: 'personal', enabled: true });

    expect(results).toHaveLength(1);
    expect(results[0].scope).toBe('note');
    expect(results[0].scopeLabel).toBe('Note');
  });

  it('skips notes for missing documents', () => {
    const note = makeNote({ documentId: 'missing-doc' });
    const map = new Map<string, HolocronDocument>();

    const results = searchNotes({ notes: [note], documentMap: map, query: 'personal', enabled: true });

    expect(results).toHaveLength(0);
  });
});

describe('combineUserStateResults', () => {
  it('deduplicates by id and sorts', () => {
    const doc = makeDoc({});

    const contentResults = [
      { id: 'document:doc-1', href: '/library/doctrine/doc-1', title: 'A Document', excerpt: '', scope: 'doctrine' as const, scopeLabel: 'Doctrine Text', sourceDocument: doc },
    ];
    const userResults = [
      { id: 'bookmark:bm-1', href: '/library/doctrine/doc-1', title: 'A Document', excerpt: 'match', scope: 'bookmark' as const, scopeLabel: 'Bookmark', sourceDocument: doc },
    ];

    const combined = combineUserStateResults(contentResults, userResults);

    expect(combined).toHaveLength(2);
    expect(combined[0].title).toBe('A Document');
  });
});
