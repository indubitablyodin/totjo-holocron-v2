export type StorageEstimate = {
  usage: number;
  quota: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
};

export function isStorageManagerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'storage' in navigator && typeof navigator.storage === 'object';
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (!isStorageManagerSupported()) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();

    if (estimate.usage === undefined || estimate.quota === undefined) {
      return null;
    }

    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usageFormatted: formatBytes(estimate.usage),
      quotaFormatted: formatBytes(estimate.quota),
      percentUsed: estimate.quota > 0 ? Math.round((estimate.usage / estimate.quota) * 100) : 0,
    };
  } catch {
    return null;
  }
}

export async function isPersistentStorageGranted(): Promise<boolean | null> {
  if (!isStorageManagerSupported()) {
    return null;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!isStorageManagerSupported()) {
    return null;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
