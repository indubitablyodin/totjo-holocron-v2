import type { HolocronDocument } from '@/content/contentTypes';

export type HolocronSearchScope =
  | 'doctrine'
  | 'supplemental'
  | 'sermon'
  | 'bookmark'
  | 'note';

export type HolocronSearchResult = {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  scope: HolocronSearchScope;
  scopeLabel: string;
  documentId?: string;
  documentSlug?: string;
  sourceDocument?: HolocronDocument;
};

export type LibrarySearchState = {
  query: string;
  scopes: Record<HolocronSearchScope, boolean>;
};

export const DEFAULT_SEARCH_SCOPES: Record<HolocronSearchScope, boolean> = {
  doctrine: true,
  supplemental: true,
  sermon: true,
  bookmark: true,
  note: true,
};

export const SEARCH_SCOPE_LABELS: Record<HolocronSearchScope, string> = {
  doctrine: 'Doctrine',
  supplemental: 'Supplemental',
  sermon: 'Sermons',
  bookmark: 'Bookmarks',
  note: 'Notes',
};
