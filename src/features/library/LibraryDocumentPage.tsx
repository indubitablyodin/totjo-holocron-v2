import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { usePersonalization } from '@/features/personalization/PersonalizationContext';
import {
  createDoctrinePersonalizationModel,
  PersonalizedDoctrineContent,
} from '@/features/personalization/personalizationOverlay';
import { CompactReaderShell, ReaderMetaList, ReaderOptionGroup, ReaderSurface } from '@/features/reader/CompactReaderShell';
import { DoctrineMarkdownContent, parseCodeView } from '@/features/reader/doctrineMarkdown';
import { ReaderUserStateSection } from '@/features/reader/ReaderUserStateSection';
import { useReadingSettings } from '@/features/settings/ReadingSettingsContext';
import { CONTRAST_OPTIONS, FONT_SCALE_OPTIONS, THEME_OPTIONS } from '@/features/settings/readingSettings';
import { doctrineLibraryEntries } from '@/lib/content';
import { getLibraryDocumentBySlug } from '@/lib/db';
import {
  getAuthorityPresentation,
  type LibraryAuthorityClass,
  type LibraryDocumentRecord,
  isLibraryDocument,
} from './libraryPresentation';

type LibraryDocumentPageProps = {
  authorityClass: LibraryAuthorityClass;
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

function DoctrineReaderNavigation({ currentSlug }: { currentSlug: string }) {
  return (
    <nav aria-label="Doctrine documents" className="reader-navigation">
      {doctrineLibraryEntries.map((entry) => (
        <Link
          className={`reader-navigation__link${entry.slug === currentSlug ? ' reader-navigation__link--active' : ''}`}
          key={entry.slug}
          to={`/library/doctrine/${entry.slug}`}
        >
          {entry.title}
        </Link>
      ))}
    </nav>
  );
}

function DoctrineCodeView({ document }: { document: LibraryDocumentRecord }) {
  const codeView = useMemo(() => parseCodeView(document.bodyMarkdown), [document.bodyMarkdown]);

  return (
    <div className="reader-copy">
      {codeView.intro.map((paragraph) => (
        <p className="reader-paragraph" key={paragraph}>
          {paragraph}
        </p>
      ))}

      <div className="code-grid" data-testid="code-view-side-by-side">
        {codeView.versions.map((version) => (
          <article className="code-column" key={version.title}>
            <h3>{version.title}</h3>
            <ol className="reader-list reader-list--ordered">
              {version.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      {codeView.attribution ? <p className="reader-attribution">{codeView.attribution}</p> : null}
    </div>
  );
}

export function LibraryDocumentPage({ authorityClass }: LibraryDocumentPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const { pronounMode } = usePersonalization();
  const { settings, updateContrast, updateFontScale, updateTheme } = useReadingSettings();
  const [document, setDocument] = useState<LibraryDocumentRecord | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const presentation = getAuthorityPresentation(authorityClass);

  const activePersonalizationEnabled = pronounMode === 'he' || pronounMode === 'she' || pronounMode === 'they';
  const resolvedStatus = slug ? status : 'not-found';

  useEffect(() => {
    let isMounted = true;

    if (!slug) {
      return () => {
        isMounted = false;
      };
    }

    void getLibraryDocumentBySlug(slug)
      .then((nextDocument) => {
        if (!isMounted) {
          return;
        }

        if (!nextDocument || !isLibraryDocument(nextDocument) || nextDocument.authorityClass !== authorityClass) {
          setDocument(null);
          setStatus('not-found');
          return;
        }

        setDocument(nextDocument);
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setDocument(null);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [authorityClass, slug]);

  // Compute models and breadcrumbs before early returns to satisfy Rules of Hooks
  const personalizedDoctrineModel = useMemo(
    () =>
      document
        ? createDoctrinePersonalizationModel({
            documentId: document.id,
            documentVersion: document.version,
            markdown: document.bodyMarkdown,
            pronounMode,
          })
        : null,
    [document, pronounMode],
  );

  if (resolvedStatus === 'not-found') {
    return (
      <PageLayout title="Document unavailable">
        <p className="support-copy">This {presentation.laneTitle.toLowerCase()} reading is not available on this device right now.</p>
        <div className="document-actions">
          <Link className="secondary-button" to="/library">
            Back to Read
          </Link>
        </div>
      </PageLayout>
    );
  }

  if (resolvedStatus === 'error') {
    return (
      <PageLayout title="Reading unavailable">
        <p className="surface-error" role="alert">
          This reading could not be opened on this device.
        </p>
      </PageLayout>
    );
  }

  if (resolvedStatus === 'loading' || !document) {
    return (
      <PageLayout title="Loading">
        <p className="support-copy">Opening this reading…</p>
      </PageLayout>
    );
  }

  return (
    <CompactReaderShell
      badges={
        <span className={`authority-badge authority-badge--${authorityClass}`} data-testid="authority-badge">
          {presentation.badgeLabel}
        </span>
      }
      controls={[
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
          panel: (
            <ReaderOptionGroup
              label="Theme"
              labels={THEME_LABELS}
              onChange={updateTheme}
              options={THEME_OPTIONS}
              value={settings.theme}
            />
          ),
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
          id: 'markers',
          label: 'Markers',
          panel: <ReaderUserStateSection documentId={document.id} documentTitle={document.title} panel="bookmark" variant="compact" />,
        },
        {
          id: 'notes',
          label: 'Notes',
          panel: <ReaderUserStateSection documentId={document.id} documentTitle={document.title} panel="note" variant="compact" />,
        },
      ]}
      title={document.title}
    >
      <ReaderSurface>
        {authorityClass === 'canonical' && document.slug === 'code' ? (
          <DoctrineCodeView document={document} />
        ) : personalizedDoctrineModel?.hasPersonalizedBlocks && activePersonalizationEnabled ? (
          <div className="document-copy">
            <PersonalizedDoctrineContent
              model={personalizedDoctrineModel}
              personalizationEnabled={true}
              showOriginalBlockIds={new Set()}
            />
          </div>
        ) : (
          <div className="document-copy">
            <DoctrineMarkdownContent markdown={document.bodyMarkdown} />
          </div>
        )}
      </ReaderSurface>

      <div className="document-actions reader-shell__footer-actions">
        <Link className="secondary-button" to="/library">
          Back to Read
        </Link>
      </div>
    </CompactReaderShell>
  );
}
