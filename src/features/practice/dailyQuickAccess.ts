export const DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY = 'totjo-holocron:daily-quick-access-middle-slot';

export type DailyQuickAccessChoice = {
  id: string;
  title: string;
  href: string;
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

export const DAILY_QUICK_ACCESS_CHOICES: DailyQuickAccessChoice[] = [
  {
    id: 'knights-code',
    title: 'Knight’s Code',
    href: '/library/supplemental/knights-code',
  },
];

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

export function getDailyQuickAccessChoiceById(value: string | null): DailyQuickAccessChoice | null {
  if (!value) {
    return null;
  }

  return DAILY_QUICK_ACCESS_CHOICES.find((choice) => choice.id === value) ?? null;
}

export function loadDailyQuickAccessMiddleSlot(): DailyQuickAccessChoice | null {
  return getDailyQuickAccessChoiceById(getStorage().getItem(DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY));
}

export function saveDailyQuickAccessMiddleSlot(choiceId: string | null) {
  const choice = getDailyQuickAccessChoiceById(choiceId);

  if (!choice) {
    getStorage().removeItem(DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY);
    return;
  }

  getStorage().setItem(DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY, choice.id);
}

export function clearDailyQuickAccessMiddleSlot() {
  getStorage().removeItem(DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY);
}
