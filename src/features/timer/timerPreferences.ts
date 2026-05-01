import {
  DEFAULT_SOUND_PROFILE_ID,
  isSoundProfileId,
  type SoundProfileId,
} from '@/features/timer/audioProfiles';
import { markLocalUserSettingsUpdated, saveLocalUserSettingsSyncUpdatedAt } from '@/lib/sync/settingsMeta';

export const TIMER_PREFERENCES_STORAGE_KEY = 'totjo-holocron:timer-preferences';

const DEFAULT_TIMER_DURATION_SECONDS = 300;
const MIN_TIMER_DURATION_SECONDS = 1;
const MAX_TIMER_DURATION_SECONDS = 60 * 60 * 8;
const MAX_INTERVAL_SECONDS = 60 * 60;

export const TIMER_CUE_MODES = ['start-end', 'start-only', 'end-only', 'custom'] as const;

export type TimerCueMode = (typeof TIMER_CUE_MODES)[number];

export function isTimerCueMode(value: unknown): value is TimerCueMode {
  return typeof value === 'string' && TIMER_CUE_MODES.includes(value as TimerCueMode);
}

export type TimerPreferences = {
  defaultDurationSeconds: number;
  defaultCueMode: TimerCueMode;
  defaultIntervalSeconds: number;
  defaultSoundProfileId: SoundProfileId;
  recordPracticeHistory: boolean;
};

export const DEFAULT_TIMER_PREFERENCES: TimerPreferences = {
  defaultDurationSeconds: DEFAULT_TIMER_DURATION_SECONDS,
  defaultCueMode: 'end-only',
  defaultIntervalSeconds: 0,
  defaultSoundProfileId: DEFAULT_SOUND_PROFILE_ID,
  recordPracticeHistory: true,
};

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toSafeInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function clampTimerDurationPreference(value: unknown): number {
  return Math.min(
    MAX_TIMER_DURATION_SECONDS,
    Math.max(MIN_TIMER_DURATION_SECONDS, toSafeInteger(value, DEFAULT_TIMER_DURATION_SECONDS)),
  );
}

export function clampTimerIntervalPreference(value: unknown): number {
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(0, toSafeInteger(value, 0)));
}

export function normalizeTimerPreferences(value: unknown): TimerPreferences {
  if (!isRecord(value)) {
    return DEFAULT_TIMER_PREFERENCES;
  }

  const defaultIntervalSeconds = clampTimerIntervalPreference(value.defaultIntervalSeconds);

  return {
    defaultDurationSeconds: clampTimerDurationPreference(value.defaultDurationSeconds),
    defaultCueMode: isTimerCueMode(value.defaultCueMode)
      ? value.defaultCueMode
      : defaultIntervalSeconds > 0
        ? 'custom'
        : DEFAULT_TIMER_PREFERENCES.defaultCueMode,
    defaultIntervalSeconds,
    defaultSoundProfileId: isSoundProfileId(value.defaultSoundProfileId)
      ? value.defaultSoundProfileId
      : DEFAULT_TIMER_PREFERENCES.defaultSoundProfileId,
    recordPracticeHistory:
      typeof value.recordPracticeHistory === 'boolean'
        ? value.recordPracticeHistory
        : DEFAULT_TIMER_PREFERENCES.recordPracticeHistory,
  };
}

export function loadTimerPreferences(): TimerPreferences {
  const rawValue = getStorage().getItem(TIMER_PREFERENCES_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_TIMER_PREFERENCES;
  }

  try {
    return normalizeTimerPreferences(JSON.parse(rawValue));
  } catch {
    return DEFAULT_TIMER_PREFERENCES;
  }
}

type SaveTimerPreferencesOptions = {
  updatedAt?: string;
  touchSyncMeta?: boolean;
};

export function saveTimerPreferences(preferences: TimerPreferences, options: SaveTimerPreferencesOptions = {}) {
  getStorage().setItem(TIMER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));

  if (typeof options.updatedAt === 'string') {
    saveLocalUserSettingsSyncUpdatedAt(options.updatedAt);
    return;
  }

  if (options.touchSyncMeta !== false) {
    markLocalUserSettingsUpdated();
  }
}

export function clearTimerPreferencesStorage() {
  getStorage().removeItem(TIMER_PREFERENCES_STORAGE_KEY);
}
