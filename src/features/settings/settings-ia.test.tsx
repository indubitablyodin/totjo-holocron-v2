import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { clearDailyPracticeClockOverride } from '@/features/practice/dailyPracticeClock';
import { clearDailyQuickAccessMiddleSlot } from '@/features/practice/dailyQuickAccess';
import { appDb, ensureStorageReady } from '@/lib/db';
import type { DocumentRecord, DownloadRecord } from '@/lib/content';

const savedSermonOptionDocument: DocumentRecord = {
  id: 'test-saved-quick-access-sermon',
  slug: 'saved-morning-homily',
  title: 'Saved Morning Homily',
  summary: 'A saved sermon option for Focus quick access tests.',
  authorityClass: 'sermon',
  documentType: 'sermon',
  sourceId: 'totjo-sermons',
  bodyMarkdown: 'A sermon saved on this device.',
  tags: ['sermon'],
  version: 1,
  checksum: 'test-saved-quick-access-sermon:checksum',
  origin: 'synced',
  source: {
    sourceType: 'test',
    sourceUrls: [],
    attribution: 'Temple of the Jedi Order',
    approvalStatus: 'approved',
    provenanceStatus: 'recorded',
  },
  sourceUrl: null,
  author: null,
  sortOrder: 0,
  publishedAt: '2026-05-01',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

const savedSermonOptionDownload: DownloadRecord = {
  id: `sermon-download:${savedSermonOptionDocument.id}`,
  documentId: savedSermonOptionDocument.id,
  status: 'ready',
  storedChecksum: savedSermonOptionDocument.checksum,
  updatedAt: '2026-05-01T00:00:00.000Z',
};

async function clearSavedSermonOptionFixture() {
  await ensureStorageReady(appDb);
  await Promise.all([appDb.downloads.delete(savedSermonOptionDownload.id), appDb.documents.delete(savedSermonOptionDocument.id)]);
}

async function seedSavedSermonOptionFixture() {
  await clearSavedSermonOptionFixture();
  await appDb.documents.put(savedSermonOptionDocument);
  await appDb.downloads.put(savedSermonOptionDownload);
}

describe('settings information architecture', () => {
  beforeEach(async () => {
    clearDailyPracticeClockOverride();
    clearDailyQuickAccessMiddleSlot();
    await clearSavedSermonOptionFixture();
  });

  afterEach(async () => {
    await clearSavedSermonOptionFixture();
  });

  it('shows a short local-only settings index with focused groups', () => {
    render(<AppTestRouter initialEntries={['/settings']} />);

    expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    expect(screen.getByTestId('settings-index')).toBeVisible();
    expect(screen.getByTestId('settings-group-reading-display')).toHaveTextContent('Reading & Display');
    expect(screen.getByTestId('settings-group-focus-practice')).toHaveTextContent('Focus & Practice');
    expect(screen.getByTestId('settings-group-timer-defaults')).toHaveTextContent('Timer Defaults');
    expect(screen.getByTestId('settings-group-about-legal')).toHaveTextContent('About & Legal');
    expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setting-font-scale')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setting-timer-sound-profile')).not.toBeInTheDocument();
  });

  it('opens focus settings and saves a manual local time override', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings']} />);

    await user.click(screen.getByTestId('settings-group-focus-practice'));

    expect(screen.getByTestId('page-title')).toHaveTextContent('Focus & Practice');
    await user.click(screen.getByTestId('setting-daily-clock-override-toggle'));
    await user.clear(screen.getByTestId('setting-daily-clock-override-input'));
    await user.type(screen.getByTestId('setting-daily-clock-override-input'), '2026-04-27T00:05');
    await user.clear(screen.getByTestId('setting-daily-clock-override-time-zone'));
    await user.type(screen.getByTestId('setting-daily-clock-override-time-zone'), 'America/Chicago');

    expect(screen.getByTestId('setting-daily-clock-override-input')).toHaveValue('2026-04-27T00:05');
    expect(screen.getByTestId('setting-daily-clock-override-time-zone')).toHaveValue('America/Chicago');
  });

  it('lets Focus settings choose and clear the Daily Focus middle quick-access slot', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings/focus-practice']} />);

    expect(screen.getByTestId('setting-daily-quick-access-middle-slot')).toHaveValue('');
    expect(await screen.findByRole('option', { name: "Knight's Code" })).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId('setting-daily-quick-access-middle-slot'), 'document:supplemental-knights-code');
    expect(screen.getByTestId('setting-daily-quick-access-middle-slot')).toHaveValue('document:supplemental-knights-code');

    await user.click(screen.getByText('Back to settings'));
    await user.click(screen.getByTestId('bottom-nav-daily'));

    expect(await screen.findByTestId('daily-quick-access-middle-slot')).toHaveTextContent("Knight's Code");
    expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/library/supplemental/knights-code');

    await user.click(screen.getByTestId('bottom-nav-settings'));
    await user.click(screen.getByTestId('settings-group-focus-practice'));
    await user.click(screen.getByTestId('setting-daily-quick-access-clear'));
    await user.click(screen.getByTestId('bottom-nav-daily'));

    expect(await screen.findByTestId('daily-quick-access-middle-slot')).toHaveTextContent('Default slot');
    expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/settings/focus-practice');
  });

  it('persists a canonical Daily Focus middle quick-access slot across a fresh app mount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AppTestRouter initialEntries={['/settings/focus-practice']} />);

    expect(await screen.findByRole('option', { name: 'The Three Tenets' })).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId('setting-daily-quick-access-middle-slot'), 'document:canon-three-tenets');
    expect(screen.getByTestId('setting-daily-quick-access-middle-slot')).toHaveValue('document:canon-three-tenets');

    await user.click(screen.getByTestId('bottom-nav-daily'));

    await waitFor(() => {
      expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveTextContent('The Three Tenets');
      expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/library/doctrine/three-tenets');
    });

    unmount();
    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveTextContent('The Three Tenets');
      expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/library/doctrine/three-tenets');
    });
  });

  it('shows saved offline sermons in Focus quick-access choices and can select one', async () => {
    const user = userEvent.setup();

    await seedSavedSermonOptionFixture();

    render(<AppTestRouter initialEntries={['/settings/focus-practice']} />);

    expect(await screen.findByRole('option', { name: 'Saved Morning Homily' })).toBeInTheDocument();

    await user.selectOptions(
      screen.getByTestId('setting-daily-quick-access-middle-slot'),
      `document:${savedSermonOptionDocument.id}`,
    );
    expect(screen.getByTestId('setting-daily-quick-access-middle-slot')).toHaveValue(`document:${savedSermonOptionDocument.id}`);

    await user.click(screen.getByTestId('bottom-nav-daily'));

    expect(await screen.findByTestId('daily-quick-access-middle-slot')).toHaveTextContent('Saved Morning Homily');
    expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/library/sermons/saved-morning-homily');
  });

  it('opens a focused reading settings page from the settings index', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/settings']} />);

    await user.click(screen.getByTestId('settings-group-reading-display'));

    expect(screen.getByTestId('page-title')).toHaveTextContent('Reading & Display');
    expect(screen.getByTestId('setting-font-scale')).toBeVisible();
    expect(screen.getByText('Back to settings')).toBeVisible();
  });
});
