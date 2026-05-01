import { getLibraryDocumentHref, isLibraryDocument } from '@/features/library/libraryPresentation';
import type { DocumentRecord, DownloadRecord } from '@/lib/content';

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

function getChoiceForDocument(document: DocumentRecord): DailyQuickAccessChoice | null {
  if ((document.authorityClass === 'canonical' || document.authorityClass === 'supplemental') && isLibraryDocument(document)) {
    return {
      id: `document:${document.id}`,
      title: document.title,
      href: getLibraryDocumentHref(document),
    };
  }

  if (document.authorityClass === 'sermon') {
    return {
      id: `document:${document.id}`,
      title: document.title,
      href: `/library/sermons/${document.slug}`,
    };
  }

  return null;
}

export function createDailyQuickAccessChoices(documents: DocumentRecord[], downloads: DownloadRecord[] = []): DailyQuickAccessChoice[] {
  const savedSermonDocumentIds = new Set(
    downloads.filter((download) => download.status === 'ready' && download.id.startsWith('sermon-download:')).map((download) => download.documentId),
  );

  return documents
    .filter(
      (document) =>
        document.authorityClass === 'canonical' ||
        document.authorityClass === 'supplemental' ||
        (document.authorityClass === 'sermon' && savedSermonDocumentIds.has(document.id)),
    )
    .map((document) => getChoiceForDocument(document))
    .filter((choice): choice is DailyQuickAccessChoice => choice !== null)
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function getDailyQuickAccessChoiceById(value: string | null, choices: DailyQuickAccessChoice[]): DailyQuickAccessChoice | null {
  return value ? choices.find((choice) => choice.id === value) ?? null : null;
}

export function loadDailyQuickAccessMiddleSlotId(): string {
  return getStorage().getItem(DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY) ?? '';
}

export function saveDailyQuickAccessMiddleSlot(choiceId: string | null) {
  if (!choiceId) {
    getStorage().removeItem(DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY);
    return;
  }

  getStorage().setItem(DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY, choiceId);
}

export function clearDailyQuickAccessMiddleSlot() {
  getStorage().removeItem(DAILY_QUICK_ACCESS_MIDDLE_SLOT_STORAGE_KEY);
}
