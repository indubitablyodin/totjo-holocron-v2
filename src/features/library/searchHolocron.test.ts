import { describe, expect, it } from 'vitest';

import { createSearchCorpusEntry, createSearchCorpus, normalizeSearchText } from '@/content/contentSearchIndex';
import { searchHolocronCorpus } from './searchHolocron';
import { DEFAULT_SEARCH_SCOPES } from './librarySearchTypes';
import type { HolocronDocument } from '@/content/contentTypes';
import type { HolocronSearchScope } from './librarySearchTypes';

const makeDoc = (overrides: Partial<HolocronDocument>): HolocronDocument => ({
  id: 'test-doc',
  slug: 'test-doc',
  title: 'Test Document',
  authorityClass: 'doctrine',
  summary: 'A test document summary.',
  tags: ['test', 'fixture'],
  sections: [{ id: 's1', bodyMarkdown: 'This is the body text for testing.', order: 1 }],
  ...overrides,
});

describe('normalizeSearchText', () => {
  it('strips markdown punctuation', () => {
    expect(normalizeSearchText('#hello *world* `code`')).toBe('hello world code');
  });

  it('lowercases', () => {
    expect(normalizeSearchText('Hello World')).toBe('hello world');
  });

  it('collapses whitespace', () => {
    expect(normalizeSearchText('  hello   world  ')).toBe('hello world');
  });
});

describe('createSearchCorpusEntry', () => {
  it('includes title, summary, body, and tags', () => {
    const doc = makeDoc({});
    const entry = createSearchCorpusEntry(doc);

    expect(entry.titleText).toBe('Test Document');
    expect(entry.bodyText).toContain('body text for testing');
    expect(entry.tagText).toBe('test fixture');
    expect(entry.searchableText).toContain('test document');
    expect(entry.searchableText).toContain('body text for testing');
  });
});

describe('createSearchCorpus', () => {
  it('creates entries for all documents', () => {
    const docs = [makeDoc({ id: 'a', slug: 'a' }), makeDoc({ id: 'b', slug: 'b' })];
    const corpus = createSearchCorpus(docs);

    expect(corpus).toHaveLength(2);
  });
});

describe('searchHolocronCorpus', () => {
  it('returns empty for empty query', () => {
    const doc = makeDoc({});
    const corpus = createSearchCorpus([doc]);

    const results = searchHolocronCorpus({ corpus, query: '', scopes: DEFAULT_SEARCH_SCOPES });
    expect(results).toEqual([]);
  });

  it('finds doctrine documents by title', () => {
    const doc = makeDoc({ title: 'The Three Tenets' });
    const corpus = createSearchCorpus([doc]);

    const results = searchHolocronCorpus({ corpus, query: 'tenets', scopes: DEFAULT_SEARCH_SCOPES });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('The Three Tenets');
    expect(results[0].scope).toBe('doctrine');
    expect(results[0].scopeLabel).toBe('Doctrine Text');
    expect(results[0].href).toBe('/library/doctrine/test-doc');
  });

  it('finds supplemental documents', () => {
    const doc = makeDoc({ authorityClass: 'supplemental', title: 'Knight Code' });
    const corpus = createSearchCorpus([doc]);

    const results = searchHolocronCorpus({ corpus, query: 'knight', scopes: DEFAULT_SEARCH_SCOPES });

    expect(results).toHaveLength(1);
    expect(results[0].scope).toBe('supplemental');
    expect(results[0].href).toBe('/library/supplemental/test-doc');
  });

  it('finds sermon documents', () => {
    const doc = makeDoc({ authorityClass: 'sermon', title: 'Morning Homily' });
    const corpus = createSearchCorpus([doc]);

    const results = searchHolocronCorpus({ corpus, query: 'homily', scopes: DEFAULT_SEARCH_SCOPES });

    expect(results).toHaveLength(1);
    expect(results[0].scope).toBe('sermon');
    expect(results[0].href).toBe('/library/sermons/test-doc');
  });

  it('excludes results for disabled scopes', () => {
    const doc = makeDoc({ title: 'Jedi Believe' });
    const corpus = createSearchCorpus([doc]);
    const scopesWithDoctrineOff = { ...DEFAULT_SEARCH_SCOPES, doctrine: false };

    const results = searchHolocronCorpus({ corpus, query: 'believe', scopes: scopesWithDoctrineOff });

    expect(results).toHaveLength(0);
  });

  it('sorts results alphabetically', () => {
    const docs = [
      makeDoc({ id: 'z', slug: 'z', title: 'Zebras' }),
      makeDoc({ id: 'a', slug: 'a', title: 'Apples' }),
    ];
    const corpus = createSearchCorpus(docs);

    const results = searchHolocronCorpus({ corpus, query: 'a', scopes: DEFAULT_SEARCH_SCOPES });

    expect(results[0].title).toBe('Apples');
    expect(results[1].title).toBe('Zebras');
  });

  it('produces excerpt with query context', () => {
    const doc = makeDoc({ title: 'The Code', sections: [{ id: 's1', bodyMarkdown: 'There is no emotion, there is peace.', order: 1 }] });
    const corpus = createSearchCorpus([doc]);

    const results = searchHolocronCorpus({ corpus, query: 'emotion', scopes: DEFAULT_SEARCH_SCOPES });

    expect(results[0].excerpt).toContain('emotion');
  });
});
