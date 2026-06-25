import { describe, expect, it } from 'vitest';

import { createBackupFilename, type UserDataBackupV1 } from './backupUserData';

describe('backupUserData', () => {
  it('createBackupFilename includes date', () => {
    const name = createBackupFilename();
    expect(name).toMatch(/^totjo-holocron-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('backup schema type is valid', () => {
    const backup: UserDataBackupV1 = {
      schemaVersion: 1,
      exportedAt: '2026-06-24T00:00:00.000Z',
      data: {
        notes: [],
        bookmarks: [],
        practiceHistory: [],
        downloads: [],
        timerPreferences: {},
        readerSettings: {},
        dismissedAnnouncements: {},
        remoteAnnouncements: [],
      },
    };

    expect(backup.schemaVersion).toBe(1);
    expect(JSON.parse(JSON.stringify(backup)).schemaVersion).toBe(1);
  });
});
