import { render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { clearAuthStorageForTests, saveStoredAuthSession } from '@/features/auth/authStorage';
import { clearReadingSettingsStorage } from '@/features/settings/readingSettings';
import { clearTimerPreferencesStorage } from '@/features/timer/timerPreferences';
import { appDb, ensureStorageReady } from '@/lib/db';
import {
  createEmptyUserSyncProfile,
  createSyncRemoteClient,
  clearLocalUserSettingsSyncMeta,
  clearTestSyncRemoteProfile,
} from '@/lib/sync';

async function resetAppDatabase() {
  await ensureStorageReady(appDb);
  await Promise.all([
    appDb.progress.clear(),
    appDb.bookmarks.clear(),
    appDb.notes.clear(),
    appDb.practiceHistory.clear(),
    appDb.downloads.clear(),
    appDb.personalizationRules.clear(),
  ]);
}

async function seedLocalAnonymousState() {
  await ensureStorageReady(appDb);

  const dailyDocument = await appDb.documents.where('slug').equals('jedi-believe').first();

  await appDb.bookmarks.put({
    id: 'bookmark-local-1',
    documentId: dailyDocument?.id ?? 'jedi-believe',
    anchor: 'opening',
    label: 'Opening reflection',
    createdAt: '2026-04-27T08:00:00.000Z',
    updatedAt: '2026-04-27T08:00:00.000Z',
  });
  await appDb.notes.put({
    id: 'note-local-1',
    documentId: dailyDocument?.id ?? 'jedi-believe',
    anchor: 'opening',
    bodyMarkdown: 'Anonymous note before sign-in',
    createdAt: '2026-04-27T08:00:00.000Z',
    updatedAt: '2026-04-27T09:00:00.000Z',
  });
  await appDb.practiceHistory.put({
    id: 'daily-practice:America/New_York:2026-04-27',
    documentId: dailyDocument?.id ?? 'jedi-believe',
    practiceKind: 'reading',
    completedAt: '2026-04-27T10:00:00.000Z',
    durationSeconds: 0,
  });
}

describe('sync status', () => {
  beforeEach(async () => {
    clearAuthStorageForTests();
    clearReadingSettingsStorage();
    clearTimerPreferencesStorage();
    clearLocalUserSettingsSyncMeta();
    await resetAppDatabase();
    await clearTestSyncRemoteProfile('test-user:reader@example.test');
  });

  afterAll(() => {
    if (appDb.isOpen()) {
      appDb.close();
    }
  });

  it('keeps local state private while dormant sync UI is hidden', async () => {
    await seedLocalAnonymousState();
    saveStoredAuthSession({
      user: {
        id: 'test-user:reader@example.test',
        email: 'reader@example.test',
      },
      signedInAt: '2026-04-27T12:00:00.000Z',
    });

    render(<AppTestRouter initialEntries={['/settings']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
      expect(screen.queryByTestId('settings-group-account-sync')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sync-status')).not.toBeInTheDocument();
    });

    const remoteProfile = await createSyncRemoteClient().loadProfile('test-user:reader@example.test');

    expect(remoteProfile).toBeNull();
    await expect(appDb.bookmarks.count()).resolves.toBe(1);
    await expect(appDb.notes.count()).resolves.toBe(1);
    await expect(appDb.practiceHistory.count()).resolves.toBe(1);
  });

  it('does not hydrate remote profile data while auth and sync are dormant', async () => {
    const remoteProfile = createEmptyUserSyncProfile('2026-04-27T12:00:00.000Z');
    remoteProfile.meta.firstUpgradeCompletedAt = '2026-04-27T12:00:00.000Z';
    remoteProfile.bookmarks = [
      {
        id: 'bookmark-remote-1',
        documentId: 'jedi-believe',
        anchor: 'opening',
        label: 'Remote bookmark',
        createdAt: '2026-04-27T08:00:00.000Z',
        updatedAt: '2026-04-27T08:00:00.000Z',
      },
    ];
    remoteProfile.notes = [
      {
        id: 'note-remote-1',
        documentId: 'jedi-believe',
        anchor: 'opening',
        bodyMarkdown: 'Remote note',
        createdAt: '2026-04-27T08:00:00.000Z',
        updatedAt: '2026-04-27T09:00:00.000Z',
      },
    ];
    remoteProfile.practiceHistory = [
      {
        id: 'daily-practice:America/New_York:2026-04-27',
        documentId: 'jedi-believe',
        practiceKind: 'reading',
        completedAt: '2026-04-27T10:00:00.000Z',
        durationSeconds: 0,
      },
    ];

    await createSyncRemoteClient().saveProfile('test-user:reader@example.test', remoteProfile);
    saveStoredAuthSession({
      user: {
        id: 'test-user:reader@example.test',
        email: 'reader@example.test',
      },
      signedInAt: '2026-04-27T12:30:00.000Z',
    });

    render(<AppTestRouter initialEntries={['/settings']} />);

    await waitFor(() => {
      expect(screen.getByTestId('page-title')).toHaveTextContent('Settings');
    });

    await expect(appDb.bookmarks.count()).resolves.toBe(0);
    await expect(appDb.notes.count()).resolves.toBe(0);
    await expect(appDb.practiceHistory.count()).resolves.toBe(0);

    expect(screen.queryByTestId('sync-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sync-preview-bookmark')).not.toBeInTheDocument();
  });
});
