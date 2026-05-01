import { markLocalUserSettingsUpdated, saveLocalUserSettingsSyncUpdatedAt } from '@/lib/sync/settingsMeta';

export const READING_SETTINGS_STORAGE_KEY = 'totjo-holocron:reading-settings';

export const FONT_SCALE_OPTIONS = ['compact', 'standard', 'large'] as const;
export const THEME_OPTIONS = ['dark', 'light'] as const;
export const CONTRAST_OPTIONS = ['standard', 'high'] as const;

export type FontScale = (typeof FONT_SCALE_OPTIONS)[number];
export type ThemeMode = (typeof THEME_OPTIONS)[number];
export type ContrastMode = (typeof CONTRAST_OPTIONS)[number];

export type ReadingSettings = {
  fontScale: FontScale;
  theme: ThemeMode;
  contrast: ContrastMode;
};

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontScale: 'standard',
  theme: 'dark',
  contrast: 'standard',
};

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const FONT_SCALE_VALUES = new Set<FontScale>(FONT_SCALE_OPTIONS);
const THEME_VALUES = new Set<ThemeMode>(THEME_OPTIONS);
const CONTRAST_VALUES = new Set<ContrastMode>(CONTRAST_OPTIONS);
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

export function normalizeReadingSettings(value: unknown): ReadingSettings {
  if (!isRecord(value)) {
    return DEFAULT_READING_SETTINGS;
  }

  const fontScale = FONT_SCALE_VALUES.has(value.fontScale as FontScale)
    ? (value.fontScale as FontScale)
    : DEFAULT_READING_SETTINGS.fontScale;
  const theme = THEME_VALUES.has(value.theme as ThemeMode)
    ? (value.theme as ThemeMode)
    : DEFAULT_READING_SETTINGS.theme;
  const contrast = CONTRAST_VALUES.has(value.contrast as ContrastMode)
    ? (value.contrast as ContrastMode)
    : DEFAULT_READING_SETTINGS.contrast;

  return {
    fontScale,
    theme,
    contrast,
  };
}

export function loadReadingSettings(): ReadingSettings {
  const rawValue = getStorage().getItem(READING_SETTINGS_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_READING_SETTINGS;
  }

  try {
    return normalizeReadingSettings(JSON.parse(rawValue));
  } catch {
    return DEFAULT_READING_SETTINGS;
  }
}

type SaveReadingSettingsOptions = {
  updatedAt?: string;
  touchSyncMeta?: boolean;
};

export function saveReadingSettings(settings: ReadingSettings, options: SaveReadingSettingsOptions = {}) {
  getStorage().setItem(READING_SETTINGS_STORAGE_KEY, JSON.stringify(settings));

  if (typeof options.updatedAt === 'string') {
    saveLocalUserSettingsSyncUpdatedAt(options.updatedAt);
    return;
  }

  if (options.touchSyncMeta !== false) {
    markLocalUserSettingsUpdated();
  }
}

export function clearReadingSettingsStorage() {
  getStorage().removeItem(READING_SETTINGS_STORAGE_KEY);
}

export function applyReadingSettings(settings: ReadingSettings, target?: Document) {
  if (!target) {
    return;
  }

  const root = target.documentElement;
  const { body } = target;

  root.dataset.theme = settings.theme;
  root.dataset.contrast = settings.contrast;
  root.style.colorScheme = settings.theme;

  body.dataset.fontScale = settings.fontScale;
  body.classList.remove('compact-reading', 'standard-reading', 'large-reading');
  body.classList.add(`${settings.fontScale}-reading`);
}
