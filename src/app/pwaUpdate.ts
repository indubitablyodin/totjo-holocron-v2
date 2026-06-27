type PwaUpdater = (reloadPage?: boolean) => Promise<void>;

export type PwaUpdateSnapshot = {
  dismissed: boolean;
  errorMessage: string | null;
  isApplyingUpdate: boolean;
  updateAvailable: boolean;
};

const DEFAULT_PWA_UPDATE_SNAPSHOT: PwaUpdateSnapshot = {
  dismissed: false,
  errorMessage: null,
  isApplyingUpdate: false,
  updateAvailable: false,
};

let snapshot: PwaUpdateSnapshot = DEFAULT_PWA_UPDATE_SNAPSHOT;
let updater: PwaUpdater | null = null;
const listeners = new Set<() => void>();

function publish(nextSnapshot: PwaUpdateSnapshot) {
  snapshot = nextSnapshot;
  listeners.forEach((listener) => {
    listener();
  });
}

function updateSnapshot(updates: Partial<PwaUpdateSnapshot>) {
  publish({
    ...snapshot,
    ...updates,
  });
}

export function getPwaUpdateSnapshot() {
  return snapshot;
}

export function subscribePwaUpdate(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setPwaUpdater(nextUpdater: PwaUpdater) {
  updater = nextUpdater;
}

export function notifyPwaUpdateAvailable() {
  updateSnapshot({
    dismissed: false,
    errorMessage: null,
    isApplyingUpdate: false,
    updateAvailable: true,
  });
}

export function dismissPwaUpdate() {
  updateSnapshot({
    dismissed: true,
    errorMessage: null,
  });
}

export async function applyPwaUpdate() {
  if (!updater) {
    updateSnapshot({
      errorMessage: 'The update service is not ready yet. Try again in a moment.',
      isApplyingUpdate: false,
    });
    return;
  }

  updateSnapshot({
    errorMessage: null,
    isApplyingUpdate: true,
  });

  try {
    await updater(true);
  } catch {
    updateSnapshot({
      errorMessage: 'The update could not be applied. Try again in a moment.',
      isApplyingUpdate: false,
    });
  }
}

export async function checkForUpdateFromStore(): Promise<boolean> {
  const { checkForAppUpdate } = await import('@/app/registerAppServiceWorker');
  const hasUpdate = await checkForAppUpdate();
  return hasUpdate;
}

export function resetPwaUpdateStateForTests() {
  updater = null;
  publish(DEFAULT_PWA_UPDATE_SNAPSHOT);
}
