import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageLayout } from '@/app/pagePrimitives';
import { usePersonalization } from '@/features/personalization/PersonalizationContext';
import {
  createDisplayPersonalizationOverlay,
  createDoctrinePersonalizationModel,
  PersonalizedDoctrineContent,
  PersonalizedTextBlock,
} from '@/features/personalization/personalizationOverlay';
import { CompactReaderShell, ReaderOptionGroup, ReaderSurface, type CompactReaderControl } from '@/features/reader/CompactReaderShell';
import { parseCodeView } from '@/features/reader/doctrineMarkdown';
import { ReaderUserStateSection } from '@/features/reader/ReaderUserStateSection';
import { useReadingSettings } from '@/features/settings/ReadingSettingsContext';
import { CONTRAST_OPTIONS, FONT_SCALE_OPTIONS, THEME_OPTIONS } from '@/features/settings/readingSettings';
import { doctrineLibraryEntries, type DocumentRecord } from '@/lib/content';
import { getDocumentBySlug } from '@/lib/db';

type CodeViewMode = 'side-by-side' | 'single-column';
type DoctrineDocumentState = {
  slug: string;
  status: 'loading' | 'ready' | 'error' | 'not-found';
  document: DocumentRecord | null;
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

function AuthorityBadge() {
  return (
    <span className="authority-badge authority-badge--canonical" data-testid="authority-badge">
      Doctrine Text
    </span>
  );
}

function HeaderBadges() {
  return (
    <div className="reader-badge-row">
      <AuthorityBadge />
    </div>
  );
}

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

function CodeReader({
  codeIntroOverlays,
  document,
  personalizationEnabled,
  viewMode,
  showOriginalBlockIds,
}: {
  codeIntroOverlays: ReturnType<typeof createDisplayPersonalizationOverlay>[];
  document: DocumentRecord;
  personalizationEnabled: boolean;
  viewMode: CodeViewMode;
  showOriginalBlockIds: Set<string>;
}) {
  const codeView = useMemo(() => parseCodeView(document.bodyMarkdown), [document.bodyMarkdown]);

  return (
    <div className="reader-copy">
      <div className="reader-copy">
        {codeView.intro.map((paragraph, index) => {
          const overlay = codeIntroOverlays[index];

          return overlay?.isPersonalized ? (
            <PersonalizedTextBlock
              className="reader-paragraph"
              key={overlay.key}
              overlay={overlay}
              personalizationEnabled={personalizationEnabled}
              showOriginal={showOriginalBlockIds.has(overlay.blockId)}
            />
          ) : (
            <p className="reader-paragraph" key={`${paragraph}-${index}`}>
              {paragraph}
            </p>
          );
        })}
      </div>

      {viewMode === 'side-by-side' ? (
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
      ) : (
        <div className="reader-copy" data-testid="code-view-single-column">
          {codeView.versions.map((version) => (
            <section className="code-stack" key={version.title}>
              <h3>{version.title}</h3>
              <ol className="reader-list reader-list--ordered">
                {version.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {codeView.attribution ? <p className="reader-attribution">{codeView.attribution}</p> : null}
    </div>
  );
}

function DoctrineBody({
  codeIntroOverlays,
  document,
  personalizationEnabled,
  personalizedDoctrineModel,
  codeViewMode,
  showOriginalBlockIds,
}: {
  codeIntroOverlays: ReturnType<typeof createDisplayPersonalizationOverlay>[];
  document: DocumentRecord;
  personalizationEnabled: boolean;
  personalizedDoctrineModel: ReturnType<typeof createDoctrinePersonalizationModel>;
  codeViewMode: CodeViewMode;
  showOriginalBlockIds: Set<string>;
}) {
  if (document.slug === 'code') {
    return (
      <CodeReader
        codeIntroOverlays={codeIntroOverlays}
        document={document}
        personalizationEnabled={personalizationEnabled}
        viewMode={codeViewMode}
        showOriginalBlockIds={showOriginalBlockIds}
      />
    );
  }

  return (
    <div className="reader-copy">
      <PersonalizedDoctrineContent
        model={personalizedDoctrineModel}
        personalizationEnabled={personalizationEnabled}
        showOriginalBlockIds={showOriginalBlockIds}
      />
    </div>
  );
}

export function DoctrinePage() {
  const { slug = '' } = useParams();
  const { pronounMode } = usePersonalization();
  const { settings, updateContrast, updateFontScale, updateTheme } = useReadingSettings();
  const [documentState, setDocumentState] = useState<DoctrineDocumentState>({
    slug,
    status: 'loading',
    document: null,
  });
  const [codeViewMode, setCodeViewMode] = useState<CodeViewMode>('side-by-side');
  useEffect(() => {
    let isMounted = true;

    void getDocumentBySlug(slug)
      .then((nextDocument) => {
        if (!isMounted) {
          return;
        }

        setDocumentState({
          slug,
          status: nextDocument ? 'ready' : 'not-found',
          document: nextDocument ?? null,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setDocumentState({
          slug,
          status: 'error',
          document: null,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const status = documentState.slug === slug ? documentState.status : 'loading';
  const document = documentState.slug === slug ? documentState.document : null;
  const resolvedDocument = status === 'ready' && document ? document : null;

  const personalizedDoctrineModel = useMemo(
    () =>
      createDoctrinePersonalizationModel({
        documentId: resolvedDocument?.id ?? 'loading-document',
        documentVersion: resolvedDocument?.version ?? 1,
        markdown: resolvedDocument?.bodyMarkdown ?? '',
        pronounMode,
      }),
    [resolvedDocument?.bodyMarkdown, resolvedDocument?.id, resolvedDocument?.version, pronounMode],
  );

  const codeIntroOverlays = useMemo(() => {
    if (!resolvedDocument || resolvedDocument.slug !== 'code') {
      return [];
    }

    return parseCodeView(resolvedDocument.bodyMarkdown).intro.map((paragraph, index) =>
      createDisplayPersonalizationOverlay({
        blockId: `code-intro-${index + 1}`,
        documentId: resolvedDocument.id,
        documentVersion: resolvedDocument.version,
        originalText: paragraph,
        pronounMode,
      }),
    );
  }, [resolvedDocument, pronounMode]);

  const activePersonalizationEnabled = pronounMode === 'he' || pronounMode === 'she' || pronounMode === 'they';
  const showOriginalBlockIds = new Set<string>();

  const controls: CompactReaderControl[] = resolvedDocument
    ? [
        {
          id: 'code-view',
          label: 'Code layout',
          panel: resolvedDocument.slug === 'code' ? (
            <div className="reader-panel-form">
              <label className="reader-field" htmlFor="code-view-mode">
                View mode
              </label>
              <select
                className="field-select reader-select"
                data-testid="code-view-mode"
                id="code-view-mode"
                onChange={(event) => {
                  setCodeViewMode(event.target.value as CodeViewMode);
                }}
                value={codeViewMode}
              >
                <option value="side-by-side">Side by side</option>
                <option value="single-column">Single column</option>
              </select>
            </div>
          ) : null,
        },
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
          id: 'bookmark',
          label: 'Bookmark',
          panel: <ReaderUserStateSection documentId={resolvedDocument.id} documentTitle={resolvedDocument.title} panel="bookmark" variant="compact" />,
        },
        {
          id: 'note',
          label: 'Note',
          panel: <ReaderUserStateSection documentId={resolvedDocument.id} documentTitle={resolvedDocument.title} panel="note" variant="compact" />,
        },
      ]
    : [];

  if (status === 'loading') {
    return (
      <PageLayout title="Loading doctrine">
        <p className="reader-empty">Opening doctrine…</p>
      </PageLayout>
    );
  }

  if (status === 'error') {
    return (
      <PageLayout title="Doctrine unavailable">
        <p className="surface-error" role="alert">
          Doctrine could not be opened on this device.
        </p>
      </PageLayout>
    );
  }

  if (status === 'not-found' || !document) {
    return (
      <PageLayout title="Document not found">
        <p className="reader-empty">Choose one of the doctrine texts in Read.</p>
        <DoctrineReaderNavigation currentSlug={slug} />
      </PageLayout>
    );
  }

  return (
    <CompactReaderShell
      badges={<HeaderBadges />}
      controls={controls}
      headerActions={<Link aria-label="Open reading display settings" className="icon-button" to="/settings/reading-display" title="Reading & Display" aria-details="settings">⚙</Link>}
      navigation={<DoctrineReaderNavigation currentSlug={document.slug} />}
      title={document.title}
    >
      <ReaderSurface>
        <DoctrineBody
          codeViewMode={codeViewMode}
          codeIntroOverlays={codeIntroOverlays}
          document={document}
          personalizationEnabled={activePersonalizationEnabled}
          personalizedDoctrineModel={personalizedDoctrineModel}
          showOriginalBlockIds={showOriginalBlockIds}
        />
      </ReaderSurface>
    </CompactReaderShell>
  );
}
