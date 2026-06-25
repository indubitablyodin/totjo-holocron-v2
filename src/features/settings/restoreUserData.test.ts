import { describe, expect, it } from 'vitest';

import {
  parseUserDataBackupJson,
  validateUserDataBackup,
  classifyRestoreRecords,
  createUserDataRestorePreview,
  type BackupDataV1,
} from './restoreUserData';
import type { CurrentUserData } from './restoreUserData';

const validBackupJson = JSON.stringify({
  schemaVersion: 1,
  exportedAt: '2026-06-24T00:00:00.000Z',
  appVersion: '0.1.0-rc.2',
  data: {
    notes: [{ id: 'note-1', documentId: 'doc-1', anchor: null, bodyMarkdown: 'My note', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }],
    bookmarks: [{ id: 'bm-1', documentId: 'doc-1', anchor: '', label: 'My bookmark', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }],
    practiceHistory: [{ id: 'ph-1', documentId: null, practiceKind: 'meditation', completedAt: '2026-06-22T14:00:00.000Z', durationSeconds: 300 }],
    downloads: [{ id: 'dl-1', documentId: 'doc-1', status: 'ready', storedChecksum: 'abc', updatedAt: '2026-06-01T00:00:00.000Z' }],
    timerPreferences: { defaultDurationSeconds: 300 },
    readerSettings: { theme: 'dark' },
  },
});

const emptyCurrent: CurrentUserData = {
  notes: [],
  bookmarks: [],
  practiceHistory: [],
  downloads: [],
};

const currentWithExisting: CurrentUserData = {
  notes: [{ id: 'note-1', documentId: 'doc-1', anchor: null, bodyMarkdown: 'My note', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }],
  bookmarks: [{ id: 'bm-1', documentId: 'doc-1', anchor: '', label: 'My bookmark', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }],
  practiceHistory: [{ id: 'ph-1', documentId: null, practiceKind: 'meditation', completedAt: '2026-06-22T14:00:00.000Z', durationSeconds: 300 }],
  downloads: [{ id: 'dl-1', documentId: 'doc-1', status: 'ready', storedChecksum: 'abc', updatedAt: '2026-06-01T00:00:00.000Z' }],
};

describe('parseUserDataBackupJson', () => {
  it('parses valid JSON', () => {
    const result = parseUserDataBackupJson(validBackupJson);
    expect(result).not.toBeNull();
    expect(result?.schemaVersion).toBe(1);
  });

  it('returns null for invalid JSON', () => {
    expect(parseUserDataBackupJson('not-json')).toBeNull();
  });

  it('returns null for non-object JSON', () => {
    expect(parseUserDataBackupJson('"string"')).toBeNull();
  });
});

describe('validateUserDataBackup', () => {
  it('accepts valid backup', () => {
    const parsed = parseUserDataBackupJson(validBackupJson);
    expect(validateUserDataBackup(parsed)).not.toBeNull();
  });

  it('rejects wrong schemaVersion', () => {
    expect(validateUserDataBackup({ schemaVersion: 2, exportedAt: '2026-01-01', data: {} })).toBeNull();
  });

  it('rejects missing exportedAt', () => {
    expect(validateUserDataBackup({ schemaVersion: 1, data: {} })).toBeNull();
  });

  it('rejects missing data object', () => {
    expect(validateUserDataBackup({ schemaVersion: 1, exportedAt: '2026-01-01' })).toBeNull();
  });

  it('rejects non-object', () => {
    expect(validateUserDataBackup(null)).toBeNull();
  });
});

describe('classifyRestoreRecords', () => {
  it('counts new records with empty current data', () => {
    const parsed = parseUserDataBackupJson(validBackupJson) as BackupDataV1;
    const result = classifyRestoreRecords(parsed, emptyCurrent);

    expect(result.notesToAdd).toBe(1);
    expect(result.bookmarksToAdd).toBe(1);
    expect(result.practiceHistoryToAdd).toBe(1);
    expect(result.downloadsToAdd).toBe(1);
    expect(result.settingsAvailable).toBe(2);
  });

  it('classifies existing notes as updates', () => {
    const parsed = parseUserDataBackupJson(validBackupJson) as BackupDataV1;
    const result = classifyRestoreRecords(parsed, currentWithExisting);

    expect(result.notesToAdd).toBe(0);
    expect(result.notesToUpdate).toBe(1);
    expect(result.bookmarksToAdd).toBe(0);
    expect(result.practiceHistoryToAdd).toBe(0);
    expect(result.downloadsToAdd).toBe(0);
  });

  it('skips records without id', () => {
    const backup: BackupDataV1 = {
      schemaVersion: 1,
      exportedAt: '2026-01-01',
      data: {
        notes: [{ noId: true } as never],
        bookmarks: [{ noId: true } as never],
        practiceHistory: [{ noId: true } as never],
        downloads: [{ noId: true } as never],
      },
    };
    const result = classifyRestoreRecords(backup, emptyCurrent);

    expect(result.notesToAdd).toBe(0);
    expect(result.skipped).toBeGreaterThanOrEqual(4);
  });

  it('warns on missing note ids', () => {
    const backup: BackupDataV1 = {
      schemaVersion: 1,
      exportedAt: '2026-01-01',
      data: { notes: [{ missingId: true } as never] },
    };
    const result = classifyRestoreRecords(backup, emptyCurrent);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns zero counts for empty arrays', () => {
    const backup: BackupDataV1 = {
      schemaVersion: 1,
      exportedAt: '2026-01-01',
      data: {
        notes: [],
        bookmarks: [],
        practiceHistory: [],
        downloads: [],
      },
    };
    const result = classifyRestoreRecords(backup, emptyCurrent);

    expect(result.notesToAdd).toBe(0);
    expect(result.bookmarksToAdd).toBe(0);
    expect(result.practiceHistoryToAdd).toBe(0);
    expect(result.downloadsToAdd).toBe(0);
  });
});

describe('createUserDataRestorePreview', () => {
  it('generates a valid preview', () => {
    const parsed = parseUserDataBackupJson(validBackupJson) as BackupDataV1;
    const preview = createUserDataRestorePreview(parsed, emptyCurrent);

    expect(preview.schemaVersion).toBe(1);
    expect(preview.counts.notesToAdd).toBe(1);
    expect(preview.counts.settingsAvailable).toBe(2);
  });

  it('does not mutate current data', () => {
    const originalLength = currentWithExisting.notes.length;
    const parsed = parseUserDataBackupJson(validBackupJson) as BackupDataV1;

    createUserDataRestorePreview(parsed, currentWithExisting);

    expect(currentWithExisting.notes.length).toBe(originalLength);
  });
});
