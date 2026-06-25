export type BackupKind = 'markdown' | 'json';

export type LastExportRecord = {
  lastExportedAt: string;
  lastExportKind: BackupKind;
};

export type FreshnessStatus =
  | 'none-needed'
  | 'never-backed-up'
  | 'fresh'
  | 'stale'
  | 'unknown';

const STORAGE_KEY = 'totjo-holocron:last-user-data-export';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadLastUserDataExport(): LastExportRecord | null {
  try {
    const storage = getStorage();

    if (!storage) {
      return null;
    }

    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as LastExportRecord;

    if (typeof parsed.lastExportedAt !== 'string' || !isValidDate(parsed.lastExportedAt)) {
      return null;
    }

    if (parsed.lastExportKind !== 'markdown' && parsed.lastExportKind !== 'json') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveLastUserDataExport(kind: BackupKind, date: Date): void {
  const record: LastExportRecord = {
    lastExportedAt: date.toISOString(),
    lastExportKind: kind,
  };

  try {
    const storage = getStorage();

    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(record));
    }
  } catch {
    // Storage unavailable — best-effort.
  }
}

export function clearLastUserDataExport(): void {
  try {
    const storage = getStorage();

    if (storage) {
      storage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Best-effort.
  }
}

export function getBackupFreshnessStatus(
  lastExport: LastExportRecord | null,
  now: Date,
  hasUserData: boolean,
): FreshnessStatus {
  if (!hasUserData) {
    return 'none-needed';
  }

  if (!lastExport) {
    return 'never-backed-up';
  }

  const lastDate = new Date(lastExport.lastExportedAt);

  if (Number.isNaN(lastDate.getTime())) {
    return 'unknown';
  }

  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'unknown';
  }

  if (diffDays <= 30) {
    return 'fresh';
  }

  return 'stale';
}

function isValidDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}
