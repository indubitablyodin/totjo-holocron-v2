import { describe, expect, it } from 'vitest';

import {
  createDisplayPersonalizationOverlay,
  createSourceTextReference,
  findSourceTextMatches,
} from '@/features/personalization/personalizationOverlay';

describe('canon-immutability', () => {
  it('keeps personalization overlays keyed to document and block identifiers without mutating source strings', () => {
    const originalText = 'The Jedi Code comes in two versions which are different ways of understanding the same teaching.';

    const overlay = createDisplayPersonalizationOverlay({
      blockId: 'paragraph-1',
      documentId: 'canon-code',
      documentVersion: 1,
      originalText,
      pronounMode: 'they',
    });

    expect(overlay.key).toBe('canon-code::paragraph-1::v1');
    expect(overlay.displayText).toBe('The Jedi Code comes in two versions that offer different ways of understanding the same teaching.');
    expect(overlay.originalText).toBe(originalText);
    expect(originalText).toBe('The Jedi Code comes in two versions which are different ways of understanding the same teaching.');
  });

  it('keeps search, bookmarks, and citations anchored to original source identifiers and wording', () => {
    const overlay = createDisplayPersonalizationOverlay({
      blockId: 'paragraph-1',
      documentId: 'canon-code',
      documentVersion: 1,
      originalText: 'The Jedi Code comes in two versions which are different ways of understanding the same teaching.',
      pronounMode: 'they',
    });

    expect(findSourceTextMatches([overlay], 'which are different ways of understanding')).toEqual([
      {
        blockId: 'paragraph-1',
        documentId: 'canon-code',
        documentVersion: 1,
        excerpt: 'The Jedi Code comes in two versions which are different ways of understanding the same teaching.',
      },
    ]);
    expect(findSourceTextMatches([overlay], 'that offer different ways of understanding')).toEqual([]);
    expect(createSourceTextReference(overlay)).toEqual({
      blockId: 'paragraph-1',
      documentId: 'canon-code',
      documentVersion: 1,
      excerpt: 'The Jedi Code comes in two versions which are different ways of understanding the same teaching.',
    });
  });
});
