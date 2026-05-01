import type {
  BookmarkRecord,
  DownloadRecord,
  NoteRecord,
  PersonalizationRuleRecord,
  PracticeHistoryRecord,
  ProgressRecord,
} from '@/lib/content';

import type { UserSettingsSnapshot, UserSyncProfile } from './types';

function compareIso(left: string, right: string): number {
  return left.localeCompare(right);
}

function sortById<T extends { id: string }>(left: T, right: T) {
  return left.id.localeCompare(right.id);
}

function selectLatestByUpdatedAt<T extends { updatedAt: string; id: string }>(left: T, right: T): T {
  const updatedAtComparison = compareIso(left.updatedAt, right.updatedAt);

  if (updatedAtComparison !== 0) {
    return updatedAtComparison > 0 ? left : right;
  }

  return left.id.localeCompare(right.id) <= 0 ? left : right;
}

function mergeLatestById<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
  const records = new Map<string, T>();

  for (const record of [...local, ...remote]) {
    const current = records.get(record.id);

    if (!current) {
      records.set(record.id, record);
      continue;
    }

    records.set(record.id, selectLatestByUpdatedAt(current, record));
  }

  return [...records.values()].sort(sortById);
}

function selectMergedBookmark(left: BookmarkRecord, right: BookmarkRecord): BookmarkRecord {
  const updatedAtComparison = compareIso(left.updatedAt, right.updatedAt);

  if (updatedAtComparison !== 0) {
    return updatedAtComparison > 0 ? left : right;
  }

  const createdAtComparison = left.createdAt.localeCompare(right.createdAt);

  if (createdAtComparison !== 0) {
    return createdAtComparison > 0 ? left : right;
  }

  return left.id.localeCompare(right.id) <= 0 ? left : right;
}

export function createBookmarkMergeKey(record: Pick<BookmarkRecord, 'documentId' | 'anchor'>): string {
  return `${record.documentId}::${record.anchor}`;
}

function mergeBookmarks(local: BookmarkRecord[], remote: BookmarkRecord[]): BookmarkRecord[] {
  const records = new Map<string, BookmarkRecord>();

  for (const record of [...local, ...remote]) {
    const key = createBookmarkMergeKey(record);
    const current = records.get(key);

    if (!current) {
      records.set(key, record);
      continue;
    }

    records.set(key, selectMergedBookmark(current, record));
  }

  return [...records.values()].sort((left, right) => {
    return (
      left.documentId.localeCompare(right.documentId) ||
      left.anchor.localeCompare(right.anchor) ||
      left.id.localeCompare(right.id)
    );
  });
}

function extractDailyPracticeDate(record: PracticeHistoryRecord): string {
  if (!record.id.startsWith('daily-practice:')) {
    return record.completedAt.slice(0, 10);
  }

  return record.id.slice(record.id.lastIndexOf(':') + 1);
}

export function createPracticeHistoryMergeKey(record: PracticeHistoryRecord): string {
  if (record.id.startsWith('daily-practice:')) {
    return `daily::${extractDailyPracticeDate(record)}::${record.documentId ?? 'unknown'}`;
  }

  if (record.practiceKind === 'meditation') {
    return `meditation::${record.id}`;
  }

  return `history::${record.id}`;
}

function selectMergedPracticeHistory(left: PracticeHistoryRecord, right: PracticeHistoryRecord): PracticeHistoryRecord {
  const completedAtComparison = left.completedAt.localeCompare(right.completedAt);

  if (completedAtComparison !== 0) {
    return completedAtComparison > 0 ? left : right;
  }

  return left.id.localeCompare(right.id) <= 0 ? left : right;
}

function mergePracticeHistory(local: PracticeHistoryRecord[], remote: PracticeHistoryRecord[]): PracticeHistoryRecord[] {
  const records = new Map<string, PracticeHistoryRecord>();

  for (const record of [...local, ...remote]) {
    const key = createPracticeHistoryMergeKey(record);
    const current = records.get(key);

    if (!current) {
      records.set(key, record);
      continue;
    }

    records.set(key, selectMergedPracticeHistory(current, record));
  }

  return [...records.values()].sort((left, right) => right.completedAt.localeCompare(left.completedAt) || left.id.localeCompare(right.id));
}

function mergeNotes(local: NoteRecord[], remote: NoteRecord[]): NoteRecord[] {
  return mergeLatestById(local, remote);
}

function mergeProgress(local: ProgressRecord[], remote: ProgressRecord[]): ProgressRecord[] {
  return mergeLatestById(local, remote);
}

function mergeDownloads(local: DownloadRecord[], remote: DownloadRecord[]): DownloadRecord[] {
  return mergeLatestById(local, remote);
}

function mergePersonalizationRules(
  local: PersonalizationRuleRecord[],
  remote: PersonalizationRuleRecord[],
  preferLocal: boolean,
): PersonalizationRuleRecord[] {
  const records = new Map<string, PersonalizationRuleRecord>();

  for (const record of preferLocal ? [...remote, ...local] : [...local, ...remote]) {
    const current = records.get(record.id);

    if (!current) {
      records.set(record.id, record);
      continue;
    }

    records.set(record.id, preferLocal ? record : selectLatestByUpdatedAt(current, record));
  }

  return [...records.values()].sort(sortById);
}

function mergeSettings(local: UserSettingsSnapshot, remote: UserSettingsSnapshot, preferLocal: boolean): UserSettingsSnapshot {
  if (preferLocal) {
    return local;
  }

  return compareIso(local.updatedAt, remote.updatedAt) >= 0 ? local : remote;
}

export function createEmptyUserSyncProfile(now = '1970-01-01T00:00:00.000Z'): UserSyncProfile {
  return {
    meta: {
      schemaVersion: 1,
      firstUpgradeCompletedAt: null,
      lastMergedAt: null,
    },
    progress: [],
    bookmarks: [],
    notes: [],
    practiceHistory: [],
    downloads: [],
    personalizationRules: [],
    settings: {
      readingSettings: {
        fontScale: 'standard',
        theme: 'dark',
        contrast: 'standard',
      },
      timerPreferences: {
        defaultDurationSeconds: 300,
        defaultCueMode: 'end-only',
        defaultIntervalSeconds: 0,
        defaultSoundProfileId: 'default-gong',
        recordPracticeHistory: true,
      },
      updatedAt: now,
    },
  };
}

export function mergeUserSyncProfiles(
  local: UserSyncProfile,
  remote: UserSyncProfile | null,
  mergedAt = new Date().toISOString(),
): UserSyncProfile {
  const resolvedRemote = remote ?? createEmptyUserSyncProfile(local.settings.updatedAt);
  const isFirstUpgrade = resolvedRemote.meta.firstUpgradeCompletedAt === null;

  return {
    meta: {
      schemaVersion: 1,
      firstUpgradeCompletedAt: resolvedRemote.meta.firstUpgradeCompletedAt ?? mergedAt,
      lastMergedAt: mergedAt,
    },
    progress: mergeProgress(local.progress, resolvedRemote.progress),
    bookmarks: mergeBookmarks(local.bookmarks, resolvedRemote.bookmarks),
    notes: mergeNotes(local.notes, resolvedRemote.notes),
    practiceHistory: mergePracticeHistory(local.practiceHistory, resolvedRemote.practiceHistory),
    downloads: mergeDownloads(local.downloads, resolvedRemote.downloads),
    personalizationRules: mergePersonalizationRules(
      local.personalizationRules,
      resolvedRemote.personalizationRules,
      isFirstUpgrade,
    ),
    settings: mergeSettings(local.settings, resolvedRemote.settings, isFirstUpgrade),
  };
}
