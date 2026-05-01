import type {
  BookmarkRecord,
  DownloadRecord,
  NoteRecord,
  PersonalizationRuleRecord,
  PracticeHistoryRecord,
  ProgressRecord,
} from '@/lib/content';
import type { ReadingSettings } from '@/features/settings/readingSettings';
import type { TimerPreferences } from '@/features/timer/timerPreferences';

export type UserSettingsSnapshot = {
  readingSettings: ReadingSettings;
  timerPreferences: TimerPreferences;
  updatedAt: string;
};

export type UserSyncProfileMeta = {
  schemaVersion: 1;
  firstUpgradeCompletedAt: string | null;
  lastMergedAt: string | null;
};

export type UserSyncProfile = {
  meta: UserSyncProfileMeta;
  progress: ProgressRecord[];
  bookmarks: BookmarkRecord[];
  notes: NoteRecord[];
  practiceHistory: PracticeHistoryRecord[];
  downloads: DownloadRecord[];
  personalizationRules: PersonalizationRuleRecord[];
  settings: UserSettingsSnapshot;
};

export type SyncStateStatus = 'local-only' | 'syncing' | 'synced' | 'retry-needed';
