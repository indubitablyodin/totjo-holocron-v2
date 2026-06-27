// For injectManifest strategy, we need to manually register the service worker
// The service worker is built to /sw.js (or /totjo-holocron-v2/sw.js for GitHub Pages)

import { notifyPwaUpdateAvailable, setPwaUpdater } from '@/app/pwaUpdate';

const CONTROLLER_CHANGE_TIMEOUT_MS = 5000;

let hasRegistered = false;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === './') {
    return '/';
  }

  return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

function getServiceWorkerPath(): string {
  // When deployed to GitHub Pages, the base path is /totjo-holocron-v2/
  // The service worker is built to the root of the base path
  const basePath = normalizeBasePath(import.meta.env.BASE_URL || '/');
  return `${basePath}sw.js`;
}

function waitForControllerChange(timeoutMs = CONTROLLER_CHANGE_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    let isSettled = false;

    const finish = (didControllerChange: boolean) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve(didControllerChange);
    };

    const handleControllerChange = () => {
      finish(true);
    };

    const timeoutId = window.setTimeout(() => {
      finish(false);
    }, timeoutMs);

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  });
}

function createUpdater(registration: ServiceWorkerRegistration) {
  return async (reloadPage: boolean = true) => {
    const waitingWorker = registration.waiting;

    if (!waitingWorker) {
      return;
    }

    const controllerChange = waitForControllerChange();
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    const didControllerChange = await controllerChange;

    if (reloadPage && didControllerChange) {
      window.location.reload();
    }
  };
}

function notifyWaitingUpdate(registration: ServiceWorkerRegistration) {
  if (!navigator.serviceWorker.controller || !registration.waiting) {
    return;
  }

  setPwaUpdater(createUpdater(registration));
  notifyPwaUpdateAvailable();
}

export function registerAppServiceWorker() {
  if (hasRegistered) {
    return;
  }

  hasRegistered = true;

  if (!('serviceWorker' in navigator)) {
    return;
  }

  const swPath = getServiceWorkerPath();

  void (async () => {
    try {
      const registration = await navigator.serviceWorker.register(swPath);
      serviceWorkerRegistration = registration;

      setPwaUpdater(createUpdater(registration));
      notifyWaitingUpdate(registration);

      const doUpdateCheck = () => {
        if (!registration) {
          return;
        }

        void registration.update().catch(() => {});
      };

      const updateInterval = window.setInterval(doUpdateCheck, 60 * 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (!newWorker) {
          return;
        }

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            notifyWaitingUpdate(registration);
          }
        });
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          doUpdateCheck();
        }
      });

      window.addEventListener('pagehide', () => {
        window.clearInterval(updateInterval);
      });
    } catch {
      // Service worker registration failed, but the app can still run without offline caching.
    }
  })();
}

export function getServiceWorkerRegistration() {
  return serviceWorkerRegistration;
}

export async function checkForAppUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      return false;
    }

    await registration.update();
    return !!registration.waiting;
  } catch {
    return false;
  }
}
