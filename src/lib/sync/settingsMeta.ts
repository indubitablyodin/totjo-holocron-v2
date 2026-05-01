export const USER_SETTINGS_SYNC_META_STORAGE_KEY = 'totjo-holocron:sync-user-settings-meta';
export const USER_SETTINGS_SYNC_EVENT = 'totjo-holocron:user-settings-sync-updated';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type LocalUserSettingsSyncMeta = {
  updatedAt: string;
};

const fallbackStorageState = new Map<string, string>();

const fallbackStorage: StorageLike = {
  getItem: (key) => fallbackStorageState.get(key) ?? null,
  setItem: (key, value) => {
    fallbackStorageState.set(key, value);
  },
  removeItem: (key) => {
    fallbackStorageState.delete(key);
  },
};

function getStorage(): StorageLike {
  if (typeof window === 'undefined') {
    return fallbackStorage;
  }

  const candidate = window.localStorage as Partial<Storage> | undefined;

  if (
    candidate &&
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  ) {
    return candidate as StorageLike;
  }

  return fallbackStorage;
}

function dispatchUserSettingsSyncEvent() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new window.Event(USER_SETTINGS_SYNC_EVENT));
}

export function loadLocalUserSettingsSyncUpdatedAt(): string {
  const rawValue = getStorage().getItem(USER_SETTINGS_SYNC_META_STORAGE_KEY);

  if (!rawValue) {
    return '1970-01-01T00:00:00.000Z';
  }

  try {
    const value = JSON.parse(rawValue) as Partial<LocalUserSettingsSyncMeta>;
    return typeof value.updatedAt === 'string' ? value.updatedAt : '1970-01-01T00:00:00.000Z';
  } catch {
    return '1970-01-01T00:00:00.000Z';
  }
}

export function saveLocalUserSettingsSyncUpdatedAt(updatedAt: string) {
  getStorage().setItem(USER_SETTINGS_SYNC_META_STORAGE_KEY, JSON.stringify({ updatedAt }));
  dispatchUserSettingsSyncEvent();
}

export function markLocalUserSettingsUpdated(updatedAt = new Date().toISOString()) {
  saveLocalUserSettingsSyncUpdatedAt(updatedAt);
}

export function clearLocalUserSettingsSyncMeta() {
  getStorage().removeItem(USER_SETTINGS_SYNC_META_STORAGE_KEY);
  dispatchUserSettingsSyncEvent();
}
