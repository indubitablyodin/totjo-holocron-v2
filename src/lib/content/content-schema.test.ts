import { describe, expect, it } from 'vitest';

import { authorityClasses, bundledContentManifest, bundledDocuments, doctrineLibraryEntries } from '@/lib/content';

describe('content-schema', () => {
  it('keeps bundled document seeds normalized across authority classes', () => {
    const bundledAuthorityClasses = new Set(bundledDocuments.map((document) => document.authorityClass));

    expect(bundledAuthorityClasses.has('canonical')).toBe(true);
    expect(bundledAuthorityClasses.has('supplemental')).toBe(true);
    expect(bundledAuthorityClasses.has('sermon')).toBe(true);
    expect(authorityClasses).toEqual(['canonical', 'supplemental', 'sermon']);
  });

  it('tracks version and checksum metadata for every bundled document', () => {
    expect(bundledContentManifest.documentIds).toHaveLength(bundledDocuments.length);
    expect(bundledContentManifest.checksum).toMatch(/^fnv1a-/);

    for (const document of bundledDocuments) {
      expect(document.version).toBeGreaterThan(0);
      expect(document.checksum).toMatch(/^fnv1a-/);
      expect(document.bodyMarkdown).not.toContain('{{');
      expect(document.bodyMarkdown).not.toContain('[[personalized-text]]');
    }
  });

  it('includes the full doctrine library in canonical bundled storage', () => {
    const doctrineSlugs = bundledDocuments
      .filter((document) => document.authorityClass === 'canonical' && document.sourceId === 'totjo-doctrine')
      .map((document) => document.slug)
      .sort();

    expect(doctrineLibraryEntries.map((entry) => entry.slug).sort()).toEqual([
      '16-teachings',
      '21-maxims',
      'a-meditation-for-jedi',
      'code',
      'jedi-believe',
      'three-tenets',
    ]);
    expect(doctrineSlugs).toEqual([
      '16-teachings',
      '21-maxims',
      'a-meditation-for-jedi',
      'code',
      'jedi-believe',
      'three-tenets',
    ]);
  });
});
