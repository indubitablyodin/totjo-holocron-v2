import { getDocumentRoute } from '@/content/contentTypes';
import type { HolocronDocument } from '@/content/contentTypes';
import type { BookmarkRecord, NoteRecord } from '@/lib/content';
import { normalizeSearchText } from '@/content/contentSearchIndex';
import { createExcerpt } from './searchHolocron';
import type { HolocronSearchResult } from './librarySearchTypes';

export function searchBookmarks({
  bookmarks,
  documentMap,
  query,
  enabled,
}: {
  bookmarks: BookmarkRecord[];
  documentMap: Map<string, HolocronDocument>;
  query: string;
  enabled: boolean;
}): HolocronSearchResult[] {
  if (!enabled || !query.trim()) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();

  return bookmarks.flatMap((bookmark) => {
    const document = documentMap.get(bookmark.documentId);

    if (!document) {
      return [];
    }

    const haystack = normalizeSearchText([bookmark.label, document.title, document.summary].join(' '));

    if (!haystack.includes(normalizedQuery)) {
      return [];
    }

    return [
      {
        id: `bookmark:${bookmark.id}`,
        href: getDocumentRoute(document),
        title: document.title,
        excerpt: createExcerpt(bookmark.label || document.summary, query),
        scope: 'bookmark' as const,
        scopeLabel: 'Bookmark',
        documentId: document.id,
        documentSlug: document.slug,
        sourceDocument: document,
      },
    ];
  });
}

export function searchNotes({
  notes,
  documentMap,
  query,
  enabled,
}: {
  notes: NoteRecord[];
  documentMap: Map<string, HolocronDocument>;
  query: string;
  enabled: boolean;
}): HolocronSearchResult[] {
  if (!enabled || !query.trim()) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();

  return notes.flatMap((note) => {
    const document = documentMap.get(note.documentId);

    if (!document) {
      return [];
    }

    const haystack = normalizeSearchText([note.bodyMarkdown, document.title, document.summary].join(' '));

    if (!haystack.includes(normalizedQuery)) {
      return [];
    }

    return [
      {
        id: `note:${note.id}`,
        href: getDocumentRoute(document),
        title: document.title,
        excerpt: createExcerpt(note.bodyMarkdown, query),
        scope: 'note' as const,
        scopeLabel: 'Note',
        documentId: document.id,
        documentSlug: document.slug,
        sourceDocument: document,
      },
    ];
  });
}

export function combineUserStateResults(
  documentResults: HolocronSearchResult[],
  userResults: HolocronSearchResult[],
): HolocronSearchResult[] {
  const seen = new Set<string>();
  const combined: HolocronSearchResult[] = [];

  for (const result of [...documentResults, ...userResults]) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      combined.push(result);
    }
  }

  return combined.sort((left, right) => left.title.localeCompare(right.title));
}
