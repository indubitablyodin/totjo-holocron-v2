import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { CompactReaderShell, ReaderMetaList, ReaderOptionGroup, ReaderSurface, type CompactReaderControl } from '@/features/reader/CompactReaderShell';
import { DoctrineMarkdownContent } from '@/features/reader/doctrineMarkdown';
import { ReaderUserStateSection } from '@/features/reader/ReaderUserStateSection';
import { useReadingSettings } from '@/features/settings/ReadingSettingsContext';
import { CONTRAST_OPTIONS, FONT_SCALE_OPTIONS, THEME_OPTIONS } from '@/features/settings/readingSettings';

import { fetchSermonDetailDocument, getSermonCacheState, getSermonDocumentBySlug, getSermonDownloadRecord, saveSermonForOffline } from './sermonSync';
import type { SermonCacheState, SermonDocumentRecord } from './types';
import { useOnlineStatus } from './useOnlineStatus';

type SermonRouteState = {
  status: 'loading' | 'ready' | 'not-found' | 'error';
  document: SermonDocumentRecord | null;
  cacheState: SermonCacheState;
};

const FONT_SCALE_LABELS = {
  compact: 'Compact',
  standard: 'Standard',
  large: 'Large',
} as const;

const THEME_LABELS = {
  dark: 'Dark',
  light: 'Light',
} as const;

const CONTRAST_LABELS = {
  standard: 'Standard',
  high: 'High',
} as const;

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

function SermonAuthorityBadge() {
  return <span className="authority-badge authority-badge--sermon">TOTJO Sermon</span>;
}

export function SermonPage() {
  const { slug = '' } = useParams();
  const { settings, updateContrast, updateFontScale, updateTheme } = useReadingSettings();
  const [routeState, setRouteState] = useState<SermonRouteState>({
    status: 'loading',
    document: null,
    cacheState: 'uncached-sermon',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [onlineDetail, setOnlineDetail] = useState<{ bodyMarkdown: string; slug: string } | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    let isMounted = true;

    const loadSermon = async () => {
      try {
        const document = await getSermonDocumentBySlug(slug);

        if (!isMounted) {
          return;
        }

        if (!document) {
          setRouteState({ status: 'not-found', document: null, cacheState: 'uncached-sermon' });
          return;
        }

        const downloadRecord = await getSermonDownloadRecord(document.id);

        if (!isMounted) {
          return;
        }

        setRouteState({
          status: 'ready',
          document,
          cacheState: getSermonCacheState(document, downloadRecord),
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setRouteState({ status: 'error', document: null, cacheState: 'uncached-sermon' });
      }
    };

    void loadSermon();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (routeState.status !== 'ready' || !routeState.document || routeState.cacheState === 'cached-sermon' || !isOnline) {
      return;
    }

    let isMounted = true;

    void fetchSermonDetailDocument(routeState.document.slug)
      .then((document) => {
        if (isMounted) {
          setOnlineDetail({ bodyMarkdown: document.bodyMarkdown, slug: document.slug });
        }
      })
      .catch(() => {
        if (isMounted) {
          setOnlineDetail(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOnline, routeState.cacheState, routeState.document, routeState.status]);

  const handleSave = async () => {
    if (!slug) {
      return;
    }

    setIsSaving(true);

    try {
      const document = await saveSermonForOffline(slug);
      setRouteState({ status: 'ready', document, cacheState: 'cached-sermon' });
    } finally {
      setIsSaving(false);
    }
  };

  const shouldUseOnlineDetail = routeState.status === 'ready' && routeState.document && routeState.cacheState !== 'cached-sermon' && isOnline;

  if (routeState.status === 'loading') {
    return (
      <PageLayout title="Loading sermon">
        <p className="support-copy">Opening this sermon…</p>
      </PageLayout>
    );
  }

  if (routeState.status === 'error') {
    return (
      <PageLayout title="Sermon unavailable">
        <p className="surface-error">This sermon could not be opened on this device.</p>
      </PageLayout>
    );
  }

  if (routeState.status === 'not-found' || !routeState.document) {
    return (
      <PageLayout title="Sermon not found">
        <p className="support-copy">Refresh the sermon list before opening this sermon.</p>
        <div className="document-actions">
          <Link className="secondary-button" to="/library/sermons">
            Go to sermons
          </Link>
        </div>
      </PageLayout>
    );
  }

  const { document, cacheState } = routeState;
  const controls: CompactReaderControl[] = [
    {
      id: 'font-scale',
      label: 'Text size',
      panel: (
        <ReaderOptionGroup
          label="Text size"
          labels={FONT_SCALE_LABELS}
          onChange={updateFontScale}
          options={FONT_SCALE_OPTIONS}
          value={settings.fontScale}
        />
      ),
    },
    {
      id: 'theme',
      label: 'Theme',
      panel: <ReaderOptionGroup label="Theme" labels={THEME_LABELS} onChange={updateTheme} options={THEME_OPTIONS} value={settings.theme} />,
    },
    {
      id: 'contrast',
      label: 'Contrast',
      panel: (
        <ReaderOptionGroup
          label="Contrast"
          labels={CONTRAST_LABELS}
          onChange={updateContrast}
          options={CONTRAST_OPTIONS}
          value={settings.contrast}
        />
      ),
    },
    {
      id: 'bookmark',
      label: 'Bookmark',
      panel: <ReaderUserStateSection documentId={document.id} documentTitle={document.title} panel="bookmark" variant="compact" />,
    },
    {
      id: 'note',
      label: 'Note',
      panel: <ReaderUserStateSection documentId={document.id} documentTitle={document.title} panel="note" variant="compact" />,
    },
  ];

  const actionAside = cacheState === 'cached-sermon'
    ? (
        <p className="sermon-status-pill sermon-status-pill--cached-sermon" role="status">
          Saved offline
        </p>
      )
    : isOnline
      ? (
          <button
            className="primary-button"
            data-testid="sermon-save-offline"
            disabled={isSaving}
            onClick={() => {
              void handleSave();
            }}
            type="button"
          >
            {isSaving ? 'Saving sermon…' : 'Save offline'}
          </button>
        )
      : (
          <p className="sermon-status-pill sermon-status-pill--uncached-sermon" data-testid="offline-sermon-message" role="alert">
            Needs connection
          </p>
        );

  return (
    <CompactReaderShell
      actionAside={actionAside}
      badges={<SermonAuthorityBadge />}
      controls={controls}
      title={document.title}
    >
      <ReaderSurface>
        {cacheState === 'cached-sermon' ? (
          <div className="document-copy">
            <DoctrineMarkdownContent markdown={document.bodyMarkdown} />
          </div>
        ) : shouldUseOnlineDetail && onlineDetail?.slug === document.slug ? (
          <div className="document-copy">
            <DoctrineMarkdownContent markdown={onlineDetail.bodyMarkdown} />
          </div>
        ) : (
          <p className="support-copy">This sermon is not available on this device yet. Connect to load it, or save it for offline reading next time.</p>
        )}
      </ReaderSurface>

      <div className="document-actions reader-shell__footer-actions">
        <Link className="secondary-button" to="/library/sermons">
          Back to sermons
        </Link>
      </div>
    </CompactReaderShell>
  );
}
