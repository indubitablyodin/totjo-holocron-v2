import { DEFAULT_READING_SETTINGS, loadReadingSettings, saveReadingSettings } from '@/features/settings/readingSettings';
import { DEFAULT_TIMER_PREFERENCES, loadTimerPreferences, saveTimerPreferences } from '@/features/timer/timerPreferences';
import { dispatchPersonalizationRulesUpdated } from '@/features/personalization/personalizationRules';
import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

import { loadLocalUserSettingsSyncUpdatedAt, saveLocalUserSettingsSyncUpdatedAt } from './settingsMeta';
import { createEmptyUserSyncProfile } from './merge';
import type { UserSyncProfile } from './types';

export async function loadLocalUserSyncProfile(database: HolocronDatabase = appDb): Promise<UserSyncProfile> {
  await ensureStorageReady(database);

  const [progress, bookmarks, notes, practiceHistory, downloads, personalizationRules] = await Promise.all([
    database.progress.toArray(),
    database.bookmarks.toArray(),
    database.notes.toArray(),
    database.practiceHistory.toArray(),
    database.downloads.toArray(),
    database.personalizationRules.toArray(),
  ]);

  const emptyProfile = createEmptyUserSyncProfile();

  return {
    ...emptyProfile,
    progress,
    bookmarks,
    notes,
    practiceHistory,
    downloads,
    personalizationRules,
    settings: {
      readingSettings: loadReadingSettings(),
      timerPreferences: loadTimerPreferences(),
      updatedAt: loadLocalUserSettingsSyncUpdatedAt(),
    },
  };
}

export async function applyUserSyncProfile(profile: UserSyncProfile, database: HolocronDatabase = appDb): Promise<void> {
  await ensureStorageReady(database);

  await database.transaction(
    'rw',
    [
      database.progress,
      database.bookmarks,
      database.notes,
      database.practiceHistory,
      database.downloads,
      database.personalizationRules,
    ],
    async () => {
      await Promise.all([
        database.progress.clear(),
        database.bookmarks.clear(),
        database.notes.clear(),
        database.practiceHistory.clear(),
        database.downloads.clear(),
        database.personalizationRules.clear(),
      ]);

      await Promise.all([
        profile.progress.length > 0 ? database.progress.bulkPut(profile.progress) : Promise.resolve(),
        profile.bookmarks.length > 0 ? database.bookmarks.bulkPut(profile.bookmarks) : Promise.resolve(),
        profile.notes.length > 0 ? database.notes.bulkPut(profile.notes) : Promise.resolve(),
        profile.practiceHistory.length > 0 ? database.practiceHistory.bulkPut(profile.practiceHistory) : Promise.resolve(),
        profile.downloads.length > 0 ? database.downloads.bulkPut(profile.downloads) : Promise.resolve(),
        profile.personalizationRules.length > 0
          ? database.personalizationRules.bulkPut(profile.personalizationRules)
          : Promise.resolve(),
      ]);
    },
  );

  saveTimerPreferences(profile.settings.timerPreferences ?? DEFAULT_TIMER_PREFERENCES, {
    updatedAt: profile.settings.updatedAt,
  });
  saveReadingSettings(profile.settings.readingSettings ?? DEFAULT_READING_SETTINGS, {
    updatedAt: profile.settings.updatedAt,
  });
  saveLocalUserSettingsSyncUpdatedAt(profile.settings.updatedAt);
  dispatchPersonalizationRulesUpdated();
}
