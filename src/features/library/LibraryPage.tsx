import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import type { BookmarkRecord, DocumentRecord, NoteRecord } from '@/lib/content';
import { appDb, ensureStorageReady, getLibraryDocuments } from '@/lib/db';

import {
  getAuthorityPresentation,
  getLibraryDocumentHref,
  isLibraryDocument,
  type LibraryDocumentRecord,
} from './libraryPresentation';

const READ_LANE_COPY = {
  canonical: {
    actionLabel: 'Read doctrine',
    countLabel: 'Doctrine',
    countSummary: 'TOTJO doctrine',
    laneDescription: 'Read the public doctrine of the Order here.',
    laneMeta: 'TOTJO doctrine',
    laneTitle: 'Doctrine',
  },
  supplemental: {
    actionLabel: 'Read text',
    countLabel: 'Supplemental',
    countSummary: 'Clearly labeled study extras',
    laneDescription: 'Read the supporting study texts here.',
    laneMeta: 'Supplemental reading',
    laneTitle: 'Supplemental',
  },
  sermon: {
    countLabel: 'Sermons',
    countSummary: 'Public archive entries',
  },
} as const;

type SearchScope = 'canonical' | 'supplemental' | 'sermon' | 'bookmark' | 'note';

type SearchResult = {
  id: string;
  href: string;
  title: string;
  summary: string;
  scope: SearchScope;
  scopeLabel: string;
};

const SEARCH_SCOPE_LABELS: Record<SearchScope, string> = {
  canonical: 'Doctrine',
  supplemental: 'Supplemental',
  sermon: 'Sermons',
  bookmark: 'Bookmarks',
  note: 'Notes',
};

const DEFAULT_SEARCH_SCOPES: Record<SearchScope, boolean> = {
  canonical: true,
  supplemental: true,
  sermon: true,
  bookmark: true,
  note: true,
};

function normalizeSearchText(value: string) {
  return value.replace(/[#>*_`-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function createExcerpt(value: string, query: string) {
  const normalizedValue = normalizeSearchText(value);

  if (!normalizedValue) {
    return '';
  }

  if (!query.trim()) {
    return normalizedValue.length > 180 ? `${normalizedValue.slice(0, 177)}...` : normalizedValue;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchIndex = normalizedValue.toLowerCase().indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return normalizedValue.length > 180 ? `${normalizedValue.slice(0, 177)}...` : normalizedValue;
  }

  const start = Math.max(0, matchIndex - 72);
  const end = Math.min(normalizedValue.length, matchIndex + normalizedQuery.length + 108);
  const excerpt = normalizedValue.slice(start, end).trim();

  return `${start > 0 ? '…' : ''}${excerpt}${end < normalizedValue.length ? '…' : ''}`;
}

function getDocumentHref(document: DocumentRecord) {
  if (document.authorityClass === 'sermon') {
    return `/library/sermons/${document.slug}`;
  }

  if (isLibraryDocument(document)) {
    return getLibraryDocumentHref(document);
  }

  return `/library`;
}

function documentMatchesFullText(document: DocumentRecord, searchTerm: string) {
  const normalizedQuery = searchTerm.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchText([document.title, document.summary, document.bodyMarkdown, document.tags.join(' ')].join(' '))
    .toLowerCase()
    .includes(normalizedQuery);
}

function LibraryCard({ document }: { document: LibraryDocumentRecord }) {
  const presentation = getAuthorityPresentation(document.authorityClass);
  const readLaneCopy = READ_LANE_COPY[document.authorityClass];

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
      <p className="library-card__meta">{readLaneCopy.laneMeta}</p>
      <div className="library-card__actions">
        <Link className="secondary-button library-card__cta" to={getLibraryDocumentHref(document)}>
          {readLaneCopy.actionLabel}
        </Link>
      </div>
    </article>
  );
}

function CollapsibleLane({ defaultOpen = false, description, documents, title }: { defaultOpen?: boolean; description: string; documents: LibraryDocumentRecord[]; title: string }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  return (
    <section className="content-section content-section--page" ref={sectionRef}>
      <button
        aria-expanded={isOpen}
        className="lane-toggle"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="lane-toggle__icon" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
        <span className="section-heading">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </span>
      </button>
      {isOpen ? (
        <div className="section-body">
          {documents.length > 0 ? (
            <div className="library-grid" role="list">
              {documents.map((document) => (
                <LibraryCard document={document} key={document.id} />
              ))}
            </div>
          ) : (
            <p className="support-copy">No entries match the current view.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function LibraryPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [hasError, setHasError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScopes, setSearchScopes] = useState(DEFAULT_SEARCH_SCOPES);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void ensureStorageReady(appDb)
      .then(() => Promise.all([getLibraryDocuments(), appDb.bookmarks.toArray(), appDb.notes.toArray()]))
      .then(([nextDocuments, nextBookmarks, nextNotes]) => {
        if (!isMounted) {
          return;
        }

        setDocuments(nextDocuments);
        setBookmarks(nextBookmarks);
        setNotes(nextNotes);
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
  const documentMap = useMemo(() => new Map(documents.map((document) => [document.id, document])), [documents]);
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return [] as SearchResult[];
    }

    const results: SearchResult[] = [];

    if (searchScopes.canonical || searchScopes.supplemental || searchScopes.sermon) {
      documents.forEach((document) => {
        const scope = document.authorityClass as SearchScope;

        if (!(scope in searchScopes) || !searchScopes[scope] || !documentMatchesFullText(document, searchTerm)) {
          return;
        }

        results.push({
          id: `${scope}:${document.id}`,
          href: getDocumentHref(document),
          title: document.title,
          summary: createExcerpt([document.summary, document.bodyMarkdown].join(' '), searchTerm),
          scope,
          scopeLabel: SEARCH_SCOPE_LABELS[scope],
        });
      });
    }

    if (searchScopes.bookmark) {
      bookmarks.forEach((bookmark) => {
        const document = documentMap.get(bookmark.documentId);

        if (!document) {
          return;
        }

        const haystack = normalizeSearchText([bookmark.label, document.title, document.summary, document.bodyMarkdown].join(' ')).toLowerCase();

        if (!haystack.includes(searchTerm.trim().toLowerCase())) {
          return;
        }

        results.push({
          id: `bookmark:${bookmark.id}`,
          href: getDocumentHref(document),
          title: document.title,
          summary: createExcerpt(bookmark.label, searchTerm),
          scope: 'bookmark',
          scopeLabel: SEARCH_SCOPE_LABELS.bookmark,
        });
      });
    }

    if (searchScopes.note) {
      notes.forEach((note) => {
        const document = documentMap.get(note.documentId);

        if (!document) {
          return;
        }

        const haystack = normalizeSearchText([note.bodyMarkdown, document.title, document.summary, document.bodyMarkdown].join(' ')).toLowerCase();

        if (!haystack.includes(searchTerm.trim().toLowerCase())) {
          return;
        }

        results.push({
          id: `note:${note.id}`,
          href: getDocumentHref(document),
          title: document.title,
          summary: createExcerpt(note.bodyMarkdown, searchTerm),
          scope: 'note',
          scopeLabel: SEARCH_SCOPE_LABELS.note,
        });
      });
    }

    return results.sort((left, right) => left.title.localeCompare(right.title) || left.scopeLabel.localeCompare(right.scopeLabel));
  }, [bookmarks, documentMap, documents, notes, searchScopes, searchTerm]);

  return (
      <PageLayout
        description="Open doctrine, study texts, sermons, bookmarks, and notes."
        eyebrow="Reading library"
        title="Read"
        headerActions={<Link aria-label="Open bookmarks" className="gear-link" data-testid="library-bookmarks-link" to="/library/bookmarks" title="Bookmarks">❋</Link>}
      >
      <PageSection
        description="Jump straight to doctrine, study texts, or sermons."
        title="Library"
      >
        <div className="library-nav-chips" role="list">
          <button
            className="nav-chip"
            onClick={() => document.getElementById('read-doctrine')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            role="listitem"
            type="button"
          >
            <span aria-hidden="true">✧</span> Doctrine
          </button>
          <button
            className="nav-chip"
            onClick={() => document.getElementById('read-supplemental')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            role="listitem"
            type="button"
          >
            <span aria-hidden="true">◈</span> Supplemental
          </button>
          <Link className="nav-chip" to="/library/sermons" role="listitem">
            <span aria-hidden="true">☰</span> Sermons
          </Link>
          <Link className="nav-chip" to="/library/bookmarks" role="listitem">
            <span aria-hidden="true">❋</span> Bookmarks
            {bookmarks.length > 0 ? <span className="nav-chip__count">{bookmarks.length}</span> : null}
          </Link>
        </div>

        {hasError ? (
          <p className="surface-error" role="alert">
            This reading list could not load on this device.
          </p>
        ) : null}

        <button
          aria-expanded={showSearch}
          className="secondary-button button-inline"
          onClick={() => setShowSearch(!showSearch)}
          type="button"
        >
          {showSearch ? 'Hide search' : 'Search readings'}
        </button>

        {showSearch ? (
          <div className="settings-form" data-testid="library-search-panel">
            <label className="field-card" htmlFor="library-search">
              <span className="field-label">Search</span>
              <span className="field-help">Search within the text and decide which sections to search.</span>
              <input
                className="field-select"
                data-testid="library-search"
                id="library-search"
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search doctrine, sermons, bookmarks, or notes"
                type="search"
                value={searchTerm}
              />
            </label>
            <div className="field-card">
              <span className="field-label">Search in</span>
              <div className="filter-toggle-group">
                {(Object.keys(SEARCH_SCOPE_LABELS) as SearchScope[]).map((scope) => (
                  <label className="filter-toggle" htmlFor={`library-search-scope-${scope}`} key={scope}>
                    <input
                      checked={searchScopes[scope]}
                      id={`library-search-scope-${scope}`}
                      onChange={(event) => {
                        setSearchScopes((currentValue) => ({
                          ...currentValue,
                          [scope]: event.target.checked,
                        }));
                      }}
                      type="checkbox"
                    />
                    {SEARCH_SCOPE_LABELS[scope]}
                  </label>
                ))}
              </div>
            </div>

            {searchTerm.trim() ? (
              <div className="library-grid" role="list">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <article className="library-card" key={result.id} role="listitem">
                      <span className="authority-badge">{result.scopeLabel}</span>
                      <h3 className="library-card__title">
                        <Link className="library-card__link" to={result.href}>
                          {result.title}
                        </Link>
                      </h3>
                      <p className="library-card__summary">{result.summary}</p>
                    </article>
                  ))
                ) : (
                  <p className="support-copy">No results matched the current search.</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </PageSection>

      <div id="read-doctrine">
        <CollapsibleLane
          defaultOpen={true}
          description={READ_LANE_COPY.canonical.laneDescription}
          documents={doctrineDocuments}
          title={READ_LANE_COPY.canonical.laneTitle}
        />
      </div>

      <div id="read-supplemental">
        <CollapsibleLane
          defaultOpen={false}
          description={READ_LANE_COPY.supplemental.laneDescription}
          documents={supplementalDocuments}
          title={READ_LANE_COPY.supplemental.laneTitle}
        />
      </div>

      <div id="read-sermons">
        <section className="content-section content-section--page">
          <div className="section-heading">
            <h2>Sermons</h2>
            <p>Browse the public sermon archive and include it in library search.</p>
          </div>
          <div className="section-body">
            <p className="support-copy">Read sermons online or save individual sermons for offline reading.</p>
            <div className="document-actions">
              <Link className="secondary-button" to="/library/sermons">
                Open sermons
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
