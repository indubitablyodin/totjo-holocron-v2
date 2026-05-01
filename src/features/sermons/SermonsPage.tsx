import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';

import { getSermonCacheState, getSermonDocuments, getSermonDownloadRecord, syncSermonArchive } from './sermonSync';
import type { SermonCacheState, SermonDocumentRecord } from './types';
import { useOnlineStatus } from './useOnlineStatus';

type SermonCardProps = {
  sermon: SermonDocumentRecord;
  cacheState: SermonCacheState;
};

type SyncStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'syncing'; message: string }
  | { kind: 'synced'; message: string }
  | { kind: 'error'; message: string };

function formatPublishedAt(publishedAt: string | null) {
  if (!publishedAt) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(publishedAt));
}

function SermonCard({ sermon, cacheState }: SermonCardProps) {
  return (
    <article className="library-card library-card--sermon" data-testid={`sermon-card-${sermon.slug}`}>
      <span className="authority-badge authority-badge--sermon">TOTJO Sermon</span>
      <h3 className="library-card__title">
        <Link className="library-card__link" to={`/library/sermons/${sermon.slug}`}>
          {sermon.title}
        </Link>
      </h3>
      <p className="library-card__summary">{sermon.summary}</p>
      <dl className="sermon-card__meta-group">
        <div>
          <dt>Author</dt>
          <dd>{sermon.author ?? 'Unknown author'}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{formatPublishedAt(sermon.publishedAt)}</dd>
        </div>
      </dl>
      <p className={`sermon-status-pill sermon-status-pill--${cacheState}`}>
        {cacheState === 'cached-sermon' ? 'Saved for offline reading' : 'Available to save'}
      </p>
    </article>
  );
}

export function SermonsPage() {
  const [sermons, setSermons] = useState<SermonDocumentRecord[]>([]);
  const [cacheStates, setCacheStates] = useState<Record<string, SermonCacheState>>({});
  const [pageStatus, setPageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    kind: 'idle',
    message: 'Connect to load the latest public sermon list on this device.',
  });
  const isOnline = useOnlineStatus();

  useEffect(() => {
    let isMounted = true;

    const loadSermons = async () => {
      try {
        const nextSermons = await getSermonDocuments();
        const nextDownloads = await Promise.all(
          nextSermons.map(async (sermon) => [sermon.id, getSermonCacheState(sermon, await getSermonDownloadRecord(sermon.id))] as const),
        );

        if (!isMounted) {
          return;
        }

        setSermons(nextSermons);
        setCacheStates(Object.fromEntries(nextDownloads));
        setPageStatus('ready');
      } catch {
        if (!isMounted) {
          return;
        }

        setPageStatus('error');
      }
    };

    void loadSermons();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSync = useCallback(async () => {
    setSyncStatus({ kind: 'syncing', message: 'Updating sermons…' });

    try {
      const syncedSermons = await syncSermonArchive();
      const nextDownloads = await Promise.all(
        syncedSermons.map(async (sermon) => [sermon.id, getSermonCacheState(sermon, await getSermonDownloadRecord(sermon.id))] as const),
      );

      setSermons(syncedSermons);
      setCacheStates(Object.fromEntries(nextDownloads));
      setPageStatus('ready');
      setSyncStatus({
        kind: 'synced',
        message: `Updated ${syncedSermons.length} sermons. Open one to save it for offline reading.`,
      });
    } catch {
      setSyncStatus({
        kind: 'error',
        message: 'Could not update sermons. Reconnect and try again.',
      });
    }
  }, []);

  useEffect(() => {
    if (!isOnline || sermons.length > 0 || syncStatus.kind === 'syncing') {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      void handleSync();
    }, 0);

    return () => {
      window.clearTimeout(syncTimer);
    };
  }, [handleSync, isOnline, sermons.length, syncStatus.kind]);

  const visibleSermons = useMemo(() => sermons.slice(0, 7), [sermons]);

  return (
    <PageLayout
      description="Browse the public TOTJO sermon archive and save sermons for offline reading."
      eyebrow="TOTJO sermons"
      title="Sermons"
    >
      <PageSection
        description="Open the latest sermons when they are available and save any sermon you want offline."
        title="Sermon access"
      >
        <div className="document-actions">
          <button
            className="primary-button"
            data-testid="sermon-sync-button"
            disabled={!isOnline || syncStatus.kind === 'syncing'}
            onClick={() => {
              void handleSync();
            }}
            type="button"
          >
            {syncStatus.kind === 'syncing' ? 'Updating sermons…' : 'Refresh sermons'}
          </button>
        </div>

        <p
          className={syncStatus.kind === 'error' || (!isOnline && sermons.length === 0) ? 'surface-error' : 'support-copy'}
          data-testid="sermon-sync-status"
          role="status"
        >
          {!isOnline && sermons.length === 0 ? 'Connect to load sermons.' : syncStatus.message}
        </p>
      </PageSection>

      <PageSection
        description="Browse the public sermon archive."
        title="Public sermon archive"
      >
        {pageStatus === 'error' ? <p className="surface-error">Sermon storage could not be loaded.</p> : null}

        {pageStatus !== 'error' && sermons.length === 0 ? (
          <p className="support-copy">No sermons are ready on this device yet. Connect and update sermons to browse the archive.</p>
        ) : null}

        {visibleSermons.length > 0 ? (
          <div className="library-grid" role="list">
            {visibleSermons.map((sermon) => (
              <SermonCard cacheState={cacheStates[sermon.id] ?? 'uncached-sermon'} key={sermon.id} sermon={sermon} />
            ))}
          </div>
        ) : null}

        {sermons.length > visibleSermons.length ? (
          <p className="support-copy">Showing the latest seven sermons here.</p>
        ) : null}
      </PageSection>

      <div className="document-actions">
        <Link className="secondary-button" to="/library">
          Back to Read
        </Link>
      </div>
    </PageLayout>
  );
}
