import type { HolocronDatabase } from '@/lib/db';
import { loadTimerPreferences } from '@/features/timer/timerPreferences';
import { loadReadingSettings } from '@/features/settings/readingSettings';
import { loadDismissedAnnouncements } from '@/features/announcements/announcementDismissal';
import { loadCachedRemoteAnnouncements } from '@/features/announcements/remoteAnnouncementCache';

export type UserDataBackupV1 = {
  schemaVersion: 1;
  exportedAt: string;
  appVersion?: string;
  data: {
    notes: unknown[];
    bookmarks: unknown[];
    practiceHistory: unknown[];
    downloads: unknown[];
    timerPreferences: unknown;
    readerSettings: unknown;
    dismissedAnnouncements: unknown;
    remoteAnnouncements: unknown;
  };
};

export async function collectUserDataBackup(database: HolocronDatabase): Promise<UserDataBackupV1> {
  const [notes, bookmarks, practiceHistory, downloads] = await Promise.all([
    database.notes.toArray(),
    database.bookmarks.toArray(),
    database.practiceHistory.toArray(),
    database.downloads.toArray(),
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: '0.1.0-rc.2',
    data: {
      notes,
      bookmarks,
      practiceHistory,
      downloads,
      timerPreferences: loadTimerPreferences(),
      readerSettings: loadReadingSettings(),
      dismissedAnnouncements: loadDismissedAnnouncements(),
      remoteAnnouncements: loadCachedRemoteAnnouncements(),
    },
  };
}

export function createBackupFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `totjo-holocron-backup-${date}.json`;
}

export function triggerJsonBackupDownload(backup: UserDataBackupV1): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = createBackupFilename();
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
