import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import type { BookmarkRecord, DocumentRecord, LibraryCounts, NoteRecord } from '@/lib/content';
import { appDb, ensureStorageReady, getLibraryCounts, getLibraryDocuments } from '@/lib/db';

import { normalizeDocumentRecord } from '@/content/contentTypes';
import { createSearchCorpus } from '@/content/contentSearchIndex';
import { searchHolocronCorpus } from './searchHolocron';
import { searchBookmarks, searchNotes, combineUserStateResults } from './searchUserState';
import { DEFAULT_SEARCH_SCOPES, type HolocronSearchResult, type HolocronSearchScope } from './librarySearchTypes';
import { LibrarySearch } from './LibrarySearch';
import { LibraryResults } from './LibraryResults';
import { LibrarySectionLinks } from './LibrarySectionLinks';

import {
  getAuthorityPresentation,
  getLibraryDocumentHref,
  isLibraryDocument,
  type LibraryDocumentRecord,
} from './libraryPresentation';

const LANE_COPY = {
  canonical: {
    actionLabel: 'Read doctrine',
    laneMeta: 'TOTJO doctrine',
    laneTitle: 'Doctrine',
  },
  supplemental: {
    actionLabel: 'Read text',
    laneMeta: 'Supplemental reading',
    laneTitle: 'Supplemental',
  },
} as const;

function LibraryCard({ document }: { document: LibraryDocumentRecord }) {
  const presentation = getAuthorityPresentation(document.authorityClass);
  const laneCopy = LANE_COPY[document.authorityClass];

  return (
    <article
      className={`library-card library-card--${document.authorityClass}`}
      data-testid={`library-card-${document.slug}`}
      role="listitem"
    >
      <span className={`authority-badge authority-badge--${document.authorityClass}`}>{presentation.badgeLabel}</span>
      <h3 className="library-card__title">
        <Link className="library-card__link" to={getLibraryDocumentHref(document)}>
          {document.title}
        </Link>
      </h3>
      <p className="library-card__summary">{document.summary}</p>
      <p className="library-card__meta">{laneCopy.laneMeta}</p>
      <div className="library-card__actions">
        <Link className="secondary-button library-card__cta" to={getLibraryDocumentHref(document)}>
          {laneCopy.actionLabel}
        </Link>
      </div>
    </article>
  );
}

export function LibraryPage() {
  const [counts, setCounts] = useState<LibraryCounts | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [hasError, setHasError] = useState(false);
  const [query, setQuery] = useState('');
  const [scopes, setScopes] = useState<Record<HolocronSearchScope, boolean>>(DEFAULT_SEARCH_SCOPES);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    void ensureStorageReady(appDb)
      .then(() => Promise.all([getLibraryCounts(), getLibraryDocuments(), appDb.bookmarks.toArray(), appDb.notes.toArray()]))
      .then(([nextCounts, nextDocuments, nextBookmarks, nextNotes]) => {
        if (!isMounted) {
          return;
        }

        setCounts(nextCounts);
        setDocuments(nextDocuments);
        setBookmarks(nextBookmarks);
        setNotes(nextNotes);
        setBookmarkCount(nextBookmarks.length);
        setHasError(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const libraryDocuments = useMemo(() => documents.filter(isLibraryDocument), [documents]);
  const doctrineDocuments = libraryDocuments.filter((document) => document.authorityClass === 'canonical');
  const supplementalDocuments = libraryDocuments.filter((document) => document.authorityClass === 'supplemental');

  const normalizedDocuments = useMemo(() => documents.map(normalizeDocumentRecord), [documents]);
  const documentMap = useMemo(() => new Map(normalizedDocuments.map((doc) => [doc.id, doc])), [normalizedDocuments]);

  const corpus = useMemo(() => createSearchCorpus(normalizedDocuments), [normalizedDocuments]);

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const contentResults = searchHolocronCorpus({ corpus, query, scopes });
    const bookmarkResults = searchBookmarks({ bookmarks, documentMap, query, enabled: scopes.bookmark });
    const noteResults = searchNotes({ notes, documentMap, query, enabled: scopes.note });

    return combineUserStateResults(contentResults, [...bookmarkResults, ...noteResults]);
  }, [bookmarks, corpus, documentMap, notes, query, scopes]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleScopeChange = useCallback((scope: HolocronSearchScope, checked: boolean) => {
    setScopes((currentValue) => ({
      ...currentValue,
      [scope]: checked,
    }));
  }, []);

  const sermonCount = counts?.sermon ?? 0;
  const bookmarkSummary = `${bookmarks.length} bookmark${bookmarks.length === 1 ? '' : 's'} · ${notes.length} note${notes.length === 1 ? '' : 's'}`;

  return (
    <PageLayout description="" eyebrow="" title="Library">
      <PageSection>
        <LibrarySearch
          query={query}
          scopes={scopes}
          onQueryChange={handleQueryChange}
          onScopeChange={handleScopeChange}
        />

        {hasError ? (
          <p className="surface-error" role="alert">
            The library could not be loaded on this device.
          </p>
        ) : null}

        <LibrarySectionLinks counts={counts} bookmarkCount={bookmarkCount} />

        <p className="support-copy">{bookmarkSummary}</p>
      </PageSection>

      <LibraryResults query={query} results={searchResults} />

      <PageSection title="Doctrine">
        {doctrineDocuments.length > 0 ? (
          <div className="library-grid" role="list">
            {doctrineDocuments.map((document) => (
              <LibraryCard document={document} key={document.id} />
            ))}
          </div>
        ) : (
          <p className="support-copy">{getAuthorityPresentation('canonical').emptyState}</p>
        )}
      </PageSection>

      <PageSection title="Supplemental">
        {supplementalDocuments.length > 0 ? (
          <div className="library-grid" role="list">
            {supplementalDocuments.map((document) => (
              <LibraryCard document={document} key={document.id} />
            ))}
          </div>
        ) : (
          <p className="support-copy">{getAuthorityPresentation('supplemental').emptyState}</p>
        )}
      </PageSection>

      <PageSection title="Sermons">
        <div className="document-actions">
          <Link className="secondary-button" to="/library/sermons">
            Open sermons
          </Link>
        </div>
      </PageSection>
    </PageLayout>
  );
}
