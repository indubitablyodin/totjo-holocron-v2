export const DAILY_PRACTICE_CLOCK_OVERRIDE_STORAGE_KEY = 'totjo-holocron:daily-practice-clock-override';

export type DailyPracticeClockOverride = {
  enabled: boolean;
  localDateTime: string;
  timeZone: string;
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

export const DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE: DailyPracticeClockOverride = {
  enabled: false,
  localDateTime: '',
  timeZone: '',
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

export function normalizeDailyPracticeClockOverride(value: unknown): DailyPracticeClockOverride {
  if (!isRecord(value)) {
    return DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE;
  }

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE.enabled,
    localDateTime:
      typeof value.localDateTime === 'string' ? value.localDateTime : DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE.localDateTime,
    timeZone: typeof value.timeZone === 'string' ? value.timeZone : DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE.timeZone,
  };
}

export function loadDailyPracticeClockOverride(): DailyPracticeClockOverride {
  const rawValue = getStorage().getItem(DAILY_PRACTICE_CLOCK_OVERRIDE_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE;
  }

  try {
    return normalizeDailyPracticeClockOverride(JSON.parse(rawValue));
  } catch {
    return DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE;
  }
}

export function saveDailyPracticeClockOverride(override: DailyPracticeClockOverride) {
  getStorage().setItem(DAILY_PRACTICE_CLOCK_OVERRIDE_STORAGE_KEY, JSON.stringify(override));
}

export function clearDailyPracticeClockOverride() {
  getStorage().removeItem(DAILY_PRACTICE_CLOCK_OVERRIDE_STORAGE_KEY);
}

export function resolveDailyPracticeNow(fallbackNow: Date, override: DailyPracticeClockOverride): Date {
  if (!override.enabled || !override.localDateTime) {
    return fallbackNow;
  }

  const match = override.localDateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return fallbackNow;
  }

  const [, year, month, day, hours, minutes] = match;
  const desiredUtcLike = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  const timeZone = resolveDailyPracticeTimeZone('UTC', override);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  let utcTimestamp = desiredUtcLike;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(utcTimestamp));
    const getPart = (type: 'year' | 'month' | 'day' | 'hour' | 'minute') => {
      const value = parts.find((part) => part.type === type)?.value;
      return value ? Number(value) : 0;
    };

    const actualUtcLike = Date.UTC(getPart('year'), getPart('month') - 1, getPart('day'), getPart('hour'), getPart('minute'));
    const diff = desiredUtcLike - actualUtcLike;

    if (diff === 0) {
      break;
    }

    utcTimestamp += diff;
  }

  const parsedOverride = new Date(utcTimestamp);

  return Number.isNaN(parsedOverride.getTime()) ? fallbackNow : parsedOverride;
}

export function resolveDailyPracticeTimeZone(fallbackTimeZone: string, override: DailyPracticeClockOverride): string {
  if (!override.enabled) {
    return fallbackTimeZone;
  }

  const normalizedTimeZone = override.timeZone.trim();

  if (normalizedTimeZone.length === 0) {
    return fallbackTimeZone;
  }

  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: normalizedTimeZone }).format(new Date());
    return normalizedTimeZone;
  } catch {
    return fallbackTimeZone;
  }
}

export function formatDailyPracticeClockInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
