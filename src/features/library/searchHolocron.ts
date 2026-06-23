import { getAuthorityLabel, getDocumentRoute } from '@/content/contentTypes';
import type { HolocronSearchCorpusEntry } from '@/content/contentSearchIndex';
import { normalizeSearchText } from '@/content/contentSearchIndex';
import type { HolocronSearchResult, HolocronSearchScope } from './librarySearchTypes';

function authorityToScope(authorityClass: string): HolocronSearchScope {
  if (authorityClass === 'doctrine') return 'doctrine';
  if (authorityClass === 'supplemental') return 'supplemental';
  if (authorityClass === 'sermon') return 'sermon';
  return 'doctrine';
}

export function createExcerpt(value: string, query: string): string {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();

  if (!normalizedValue) {
    return '';
  }

  if (!query.trim()) {
    return normalizedValue.length > 180
      ? `${normalizedValue.slice(0, 177)}...`
      : normalizedValue;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchIndex = normalizedValue.toLowerCase().indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return normalizedValue.length > 180
      ? `${normalizedValue.slice(0, 177)}...`
      : normalizedValue;
  }

  const start = Math.max(0, matchIndex - 72);
  const end = Math.min(normalizedValue.length, matchIndex + normalizedQuery.length + 108);
  const excerpt = normalizedValue.slice(start, end).trim();

  return `${start > 0 ? '…' : ''}${excerpt}${end < normalizedValue.length ? '…' : ''}`;
}

export function searchHolocronCorpus({
  corpus,
  query,
  scopes,
}: {
  corpus: HolocronSearchCorpusEntry[];
  query: string;
  scopes: Record<HolocronSearchScope, boolean>;
}): HolocronSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return corpus
    .filter((entry) => {
      const scope = authorityToScope(entry.document.authorityClass);
      return scopes[scope] && entry.searchableText.includes(normalizedQuery);
    })
    .map((entry) => ({
      id: `document:${entry.document.id}`,
      href: getDocumentRoute(entry.document),
      title: entry.document.title,
      excerpt: createExcerpt(entry.bodyText || entry.document.summary, query),
      scope: authorityToScope(entry.document.authorityClass),
      scopeLabel: getAuthorityLabel(entry.document.authorityClass),
      documentId: entry.document.id,
      documentSlug: entry.document.slug,
      sourceDocument: entry.document,
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}
