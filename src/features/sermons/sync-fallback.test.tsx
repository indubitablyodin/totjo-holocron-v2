import { indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ReadingSettingsProvider } from '@/features/settings/ReadingSettingsContext';
import { createChecksum } from '@/lib/content';
import { appDb } from '@/lib/db';
import { resetBootstrapState } from '@/lib/db/bootstrap';

import { SermonPage } from './SermonPage';
import { SermonsPage } from './SermonsPage';

const IMPORTED_AT = '2026-04-27T00:00:00.000Z';

function buildSermonDocument({
  slug,
  title,
  author,
  publishedAt,
  summary,
  bodyMarkdown,
  sortOrder,
}: {
  slug: string;
  title: string;
  author: string;
  publishedAt: string;
  summary: string;
  bodyMarkdown: string;
  sortOrder: number;
}) {
  return {
    id: `sermon-${slug}`,
    slug,
    title,
    summary,
    authorityClass: 'sermon' as const,
    documentType: 'sermon' as const,
    sourceId: 'totjo-sermons',
    bodyMarkdown,
    tags: ['sermon'],
    version: 1,
    checksum: createChecksum({
      id: `sermon-${slug}`,
      slug,
      title,
      authorityClass: 'sermon',
      documentType: 'sermon',
      sourceId: 'totjo-sermons',
      sourceUrl: `https://templeofthejediorder.org/sermons/${slug}`,
      author,
      bodyMarkdown,
      version: 1,
    }),
    origin: 'synced' as const,
    source: {
      sourceType: 'public-totjo-page',
      sourceUrls: ['https://templeofthejediorder.org/sermons', `https://templeofthejediorder.org/sermons/${slug}`],
      attribution: 'Temple of the Jedi Order',
      approvalStatus: 'review-required' as const,
      provenanceStatus: 'recorded' as const,
    },
    sourceUrl: `https://templeofthejediorder.org/sermons/${slug}`,
    author,
    sortOrder,
    publishedAt,
    updatedAt: IMPORTED_AT,
  };
}

const cachedSermon = buildSermonDocument({
  slug: 'the-force-works-all-things-out',
  title: 'The Force Works All Things Out',
  author: 'Rosalyn Johnson',
  publishedAt: '2026-04-09T18:34:19.000Z',
  summary: 'Before I begin, I’d like us all to take a moment to meditate on two questions.',
  bodyMarkdown:
    'Before I begin, I’d like us all to take a moment to meditate on two questions.\n\nWe emulate what we understand of the Jedi path, but it’s important to remember that heroes are not without flaws.\n\nMay the Force be with you',
  sortOrder: 1,
});

const uncachedSermon = buildSermonDocument({
  slug: 'resilience-and-integration-of-practice',
  title: 'Resilience and integration of practice',
  author: 'Zanthan Storm',
  publishedAt: '2026-04-03T12:00:00.000Z',
  summary: 'Resilience is not a shield that keeps life from touching us.',
  bodyMarkdown:
    'Resilience is not a shield that keeps life from touching us.\n\nIt is the discipline of returning to the path with more honesty than before.\n\nPractice, rest, and community belong together.',
  sortOrder: 2,
});

const refreshedCachedSermon = buildSermonDocument({
  slug: 'the-force-works-all-things-out',
  title: 'The Force Works All Things Out',
  author: 'Rosalyn Johnson',
  publishedAt: '2026-04-09T18:34:19.000Z',
  summary: 'Before I begin, I’d like us all to take a moment to meditate on two questions.',
  bodyMarkdown:
    'Before I begin, I’d like us all to take a moment to meditate on two questions:\n\nI don’t pretend to know what Yoda was doing for all those years on Dagobah. Training? Regretting? Hoping? But, how often do we think of the time we acted or didn’t act because we were afraid with regret or with shame?\n\nWe emulate what we understand of the Jedi path, but it’s important to remember that heroes are not without flaws. They don’t always take the courageous path.\n\nOur statement of faith begins with “Jedi believe in the Force…”. There are many ways to interpret this, but for the purpose of this sermon, let us use the etymological definition “to have faith or confidence in”.\n\nWe are instruments of peace (Meditation for Jedi), agents of the Force (Maxim 9).\n\nMay the Force be with you',
  sortOrder: 1,
});

const manifest = {
  importedAt: IMPORTED_AT,
  checksum: createChecksum(['manifest']),
  documents: [
    { ...cachedSermon, bodyMarkdown: '', checksum: createChecksum({ slug: cachedSermon.slug, bodyMarkdown: '' }) },
    { ...uncachedSermon, bodyMarkdown: '', checksum: createChecksum({ slug: uncachedSermon.slug, bodyMarkdown: '' }) },
  ],
};

function createJsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

async function clearAppDatabase() {
  if (appDb.isOpen()) {
    appDb.close();
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(appDb.name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete app database.'));
    request.onblocked = () => reject(new Error('Deleting app database was blocked.'));
  });
}

function SermonTestRouter({ initialEntries }: { initialEntries: string[] }) {
  return (
    <ReadingSettingsProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<SermonsPage />} path="/library/sermons" />
          <Route element={<SermonPage />} path="/library/sermons/:slug" />
        </Routes>
      </MemoryRouter>
    </ReadingSettingsProvider>
  );
}

beforeEach(() => {
  setNavigatorOnline(true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearAppDatabase();
  resetBootstrapState();
});

describe('sync-fallback sermon reading', () => {
  it('keeps a saved sermon readable offline and shows a fallback for unsaved sermons', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith('/imports/totjo-sermons/index.json')) {
        return createJsonResponse(manifest);
      }

      if (url.endsWith('/imports/totjo-sermons/the-force-works-all-things-out.json')) {
        return createJsonResponse({ document: cachedSermon });
      }

      if (url.endsWith('/imports/totjo-sermons/resilience-and-integration-of-practice.json')) {
        return createJsonResponse({ document: uncachedSermon });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const sermonsView = render(<SermonTestRouter initialEntries={['/library/sermons']} />);

    await user.click(await screen.findByTestId('sermon-sync-button'));

    await waitFor(() => {
      expect(screen.getByTestId('sermon-card-the-force-works-all-things-out')).toBeVisible();
      expect(screen.getByTestId('sermon-card-resilience-and-integration-of-practice')).toBeVisible();
    });

    await user.click(screen.getByRole('link', { name: 'The Force Works All Things Out' }));

    await waitFor(() => {
      expect(screen.getByTestId('reader-controls-toggle')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Save offline' })).toBeVisible();
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Before I begin, I’d like us all to take a moment/i).length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: 'Save offline' }));
    await waitFor(() => expect(screen.getByText('Saved offline')).toBeVisible());

    sermonsView.unmount();

    setNavigatorOnline(false);

    const cachedOfflineView = render(<SermonTestRouter initialEntries={['/library/sermons/the-force-works-all-things-out']} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Before I begin, I’d like us all to take a moment/i).length).toBeGreaterThan(0);
    });

    cachedOfflineView.unmount();

    render(<SermonTestRouter initialEntries={['/library/sermons/resilience-and-integration-of-practice']} />);

    await waitFor(() => {
      expect(screen.getByText('Connect to load this sermon')).toBeVisible();
      expect(
        screen.getByText('This sermon summary is saved here, but the full sermon is not on this device yet.'),
      ).toBeVisible();
    });
  });

  it('refreshes previously cached sermon bodies when synced imports change', async () => {
    const user = userEvent.setup();
    const staleCachedSermon = {
      ...cachedSermon,
      bodyMarkdown:
        'Before I begin, I’d like us all to take a moment to meditate on two questions.\n\nWe emulate what we understand of the Jedi path, but it’s important to remember that heroes are not without flaws.\n\nMay the Force be with you',
      checksum: createChecksum({ slug: cachedSermon.slug, bodyMarkdown: 'stale-sermon-body' }),
    };
    const refreshedDetail = {
      document: refreshedCachedSermon,
    };
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith('/imports/totjo-sermons/index.json')) {
        return createJsonResponse(manifest);
      }

      if (url.endsWith('/imports/totjo-sermons/the-force-works-all-things-out.json')) {
        return createJsonResponse(refreshedDetail);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    await appDb.open();
    await appDb.documents.put(staleCachedSermon);
    await appDb.downloads.put({
      id: `sermon-download:${staleCachedSermon.id}`,
      documentId: staleCachedSermon.id,
      status: 'ready',
      storedChecksum: staleCachedSermon.checksum,
      updatedAt: IMPORTED_AT,
    });

    render(<SermonTestRouter initialEntries={['/library/sermons']} />);

    await user.click(await screen.findByTestId('sermon-sync-button'));

    await waitFor(async () => {
      const refreshedDocument = await appDb.documents.get(staleCachedSermon.id);
      expect(refreshedDocument?.bodyMarkdown).toContain('I don’t pretend to know what Yoda was doing for all those years on Dagobah.');
      expect(refreshedDocument?.bodyMarkdown).toContain('Our statement of faith begins with “Jedi believe in the Force…”.');
    });
  });
});
