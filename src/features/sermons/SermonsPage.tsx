import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';

import { getSermonCacheState, getSermonDocuments, getSermonDownloadRecord, syncSermonArchive } from './sermonSync';
import type { SermonCacheState, SermonDocumentRecord } from './types';
import { useOnlineStatus } from './useOnlineStatus';

const SERMON_AUTO_SYNC_SESSION_KEY = 'totjo:sermons:auto-sync-attempted';

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

function hasAttemptedAutoSyncThisSession() {
  try {
    return window.sessionStorage.getItem(SERMON_AUTO_SYNC_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function markAutoSyncAttemptedThisSession() {
  try {
    window.sessionStorage.setItem(SERMON_AUTO_SYNC_SESSION_KEY, 'true');
  } catch {
    // Ignore session storage failures and keep the manual refresh button available.
  }
}

function SermonCard({ sermon, cacheState }: SermonCardProps) {
  const isCached = cacheState === 'cached-sermon';

  return (
    <article className="library-card" data-testid={`sermon-card-${sermon.slug}`} role="listitem">
      <Link className="library-card__link" to={`/library/sermons/${sermon.slug}`}>
        <h3 className="library-card__title">{sermon.title}</h3>
      </Link>
      <p className="library-card__summary">{sermon.summary}</p>
      <p className="library-card__meta">
        {sermon.author ? `${sermon.author} · ` : ''}
        {formatPublishedAt(sermon.publishedAt)}
      </p>
      <div className="library-card__actions">
        <Link className="secondary-button library-card__cta" to={`/library/sermons/${sermon.slug}`}>
          {isCached ? 'Read offline' : 'Read sermon'}
        </Link>
      </div>
    </article>
  );
}

export function SermonsPage() {
  const isOnline = useOnlineStatus();
  const [sermons, setSermons] = useState<SermonDocumentRecord[]>([]);
  const [cacheStates, setCacheStates] = useState<Record<string, SermonCacheState>>({});
  const [pageStatus, setPageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    kind: 'idle',
    message: isOnline ? 'Sermons ready. Tap Refresh to get the latest.' : 'Connect to browse sermons.',
  });

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
        message: `Updated ${syncedSermons.length} sermons.`,
      });
    } catch {
      setSyncStatus({
        kind: 'error',
        message: 'Could not update sermons. Reconnect and try again.',
      });
    }
  }, []);

  useEffect(() => {
    if (!isOnline || syncStatus.kind === 'syncing' || hasAttemptedAutoSyncThisSession()) {
      return;
    }

    markAutoSyncAttemptedThisSession();

    const syncTimer = window.setTimeout(() => {
      void handleSync();
    }, 0);

    return () => {
      window.clearTimeout(syncTimer);
    };
  }, [handleSync, isOnline, syncStatus.kind]);

  const savedOffline = useMemo(
    () => sermons.filter((s) => cacheStates[s.id] === 'cached-sermon'),
    [cacheStates, sermons],
  );

  return (
    <PageLayout title="Sermons">
      <PageSection>
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
          {!isOnline && sermons.length === 0 ? 'Connect to browse sermons.' : syncStatus.message}
        </p>
      </PageSection>

      {pageStatus === 'error' ? (
        <p className="surface-error">Sermon storage could not be loaded.</p>
      ) : null}

      {savedOffline.length > 0 ? (
        <PageSection title="Saved offline">
          <div className="library-grid" role="list">
            {savedOffline.map((sermon) => (
              <SermonCard cacheState={cacheStates[sermon.id] ?? 'uncached-sermon'} key={sermon.id} sermon={sermon} />
            ))}
          </div>
        </PageSection>
      ) : null}

      <PageSection title="All sermons">
        {sermons.length === 0 && pageStatus !== 'error' ? (
          <p className="support-copy">No sermons are ready yet. Connect and refresh to browse the archive.</p>
        ) : null}

        {sermons.length > 0 ? (
          <div className="library-grid" role="list">
            {sermons.map((sermon) => (
              <SermonCard cacheState={cacheStates[sermon.id] ?? 'uncached-sermon'} key={sermon.id} sermon={sermon} />
            ))}
          </div>
        ) : null}
      </PageSection>
    </PageLayout>
  );
}
