import type { BookmarkRecord, NoteRecord, PracticeHistoryRecord, DownloadRecord } from '@/lib/content';

export type RestorePreviewV1 = {
  schemaVersion: 1;
  backupExportedAt: string;
  generatedAt: string;
  counts: {
    notesToAdd: number;
    notesToUpdate: number;
    bookmarksToAdd: number;
    practiceHistoryToAdd: number;
    downloadsToAdd: number;
    settingsAvailable: number;
    skipped: number;
  };
  warnings: string[];
};

export type CurrentUserData = {
  notes: NoteRecord[];
  bookmarks: BookmarkRecord[];
  practiceHistory: PracticeHistoryRecord[];
  downloads: DownloadRecord[];
};

export type BackupDataV1 = {
  schemaVersion: unknown;
  exportedAt: unknown;
  appVersion?: unknown;
  data?: {
    notes?: unknown[];
    bookmarks?: unknown[];
    practiceHistory?: unknown[];
    downloads?: unknown[];
    timerPreferences?: unknown;
    readerSettings?: unknown;
    dismissedAnnouncements?: unknown;
    remoteAnnouncements?: unknown;
  };
};

export function parseUserDataBackupJson(text: string): BackupDataV1 | null {
  try {
    const parsed = JSON.parse(text);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed as BackupDataV1;
  } catch {
    return null;
  }
}

export function validateUserDataBackup(value: unknown): BackupDataV1 | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    return null;
  }

  if (typeof record.exportedAt !== 'string') {
    return null;
  }

  const date = new Date(record.exportedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (!record.data || typeof record.data !== 'object') {
    return null;
  }

  return record as BackupDataV1;
}

function idExistsIn<T extends { id: string }>(id: string, records: T[]): boolean {
  return records.some((r) => r.id === id);
}

export function classifyRestoreRecords(
  backup: BackupDataV1,
  current: CurrentUserData,
): {
  notesToAdd: number;
  notesToUpdate: number;
  bookmarksToAdd: number;
  practiceHistoryToAdd: number;
  downloadsToAdd: number;
  settingsAvailable: number;
  skipped: number;
  warnings: string[];
} {
  const counts = {
    notesToAdd: 0,
    notesToUpdate: 0,
    bookmarksToAdd: 0,
    practiceHistoryToAdd: 0,
    downloadsToAdd: 0,
    settingsAvailable: 0,
    skipped: 0,
  };
  const warnings: string[] = [];

  const data = backup.data;

  if (!data) {
    return { ...counts, warnings };
  }

  // Notes
  if (Array.isArray(data.notes)) {
    for (const note of data.notes) {
      if (!note || typeof note !== 'object') {
        counts.skipped++;
        continue;
      }

      const n = note as Record<string, unknown>;

      if (typeof n.id !== 'string') {
        counts.skipped++;
        warnings.push(`Skipped note without id.`);
        continue;
      }

      if (idExistsIn(n.id, current.notes)) {
        counts.notesToUpdate++;
      } else {
        counts.notesToAdd++;
      }
    }
  }

  // Bookmarks
  if (Array.isArray(data.bookmarks)) {
    for (const bm of data.bookmarks) {
      if (!bm || typeof bm !== 'object') {
        counts.skipped++;
        continue;
      }

      const b = bm as Record<string, unknown>;

      if (typeof b.id !== 'string') {
        counts.skipped++;
        continue;
      }

      if (idExistsIn(b.id, current.bookmarks)) {
        counts.skipped++;
      } else {
        counts.bookmarksToAdd++;
      }
    }
  }

  // Practice history
  if (Array.isArray(data.practiceHistory)) {
    for (const entry of data.practiceHistory) {
      if (!entry || typeof entry !== 'object') {
        counts.skipped++;
        continue;
      }

      const e = entry as Record<string, unknown>;

      if (typeof e.id !== 'string') {
        counts.skipped++;
        continue;
      }

      if (idExistsIn(e.id, current.practiceHistory)) {
        counts.skipped++;
      } else {
        counts.practiceHistoryToAdd++;
      }
    }
  }

  // Downloads
  if (Array.isArray(data.downloads)) {
    for (const dl of data.downloads) {
      if (!dl || typeof dl !== 'object') {
        counts.skipped++;
        continue;
      }

      const d = dl as Record<string, unknown>;

      if (typeof d.id !== 'string') {
        counts.skipped++;
        continue;
      }

      if (idExistsIn(d.id, current.downloads)) {
        counts.skipped++;
      } else {
        counts.downloadsToAdd++;
      }
    }
  }

  // Settings
  if (data.timerPreferences) {
    counts.settingsAvailable++;
  }

  if (data.readerSettings) {
    counts.settingsAvailable++;
  }

  return { ...counts, warnings };
}

export function createUserDataRestorePreview(
  backup: BackupDataV1,
  current: CurrentUserData,
): RestorePreviewV1 {
  const classified = classifyRestoreRecords(backup, current);

  return {
    schemaVersion: 1,
    backupExportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : '',
    generatedAt: new Date().toISOString(),
    counts: {
      notesToAdd: classified.notesToAdd,
      notesToUpdate: classified.notesToUpdate,
      bookmarksToAdd: classified.bookmarksToAdd,
      practiceHistoryToAdd: classified.practiceHistoryToAdd,
      downloadsToAdd: classified.downloadsToAdd,
      settingsAvailable: classified.settingsAvailable,
      skipped: classified.skipped,
    },
    warnings: classified.warnings,
  };
}
