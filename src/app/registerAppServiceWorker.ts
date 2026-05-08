// For injectManifest strategy, we need to manually register the service worker
// The service worker is built to /sw.js (or /totjo-holocron-v2/sw.js for GitHub Pages)

import { notifyPwaUpdateAvailable, setPwaUpdater } from '@/app/pwaUpdate';

let hasRegistered = false;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

function getServiceWorkerPath(): string {
  // When deployed to GitHub Pages, the base path is /totjo-holocron-v2/
  // The service worker is built to the root of the base path
  const basePath = import.meta.env.BASE_URL || '/';
  return `${basePath}sw.js`;
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

  // Manually register the service worker for injectManifest strategy
  // Register immediately (not on load) so browser can detect PWA as soon as possible
  void (async () => {
    try {
      const registration = await navigator.serviceWorker.register(swPath);
      serviceWorkerRegistration = registration;

      // Define the updater function once, using the current registration
      const createUpdater = (reg: ServiceWorkerRegistration) => async (reloadPage: boolean = true) => {
        if (reg.waiting) {
          await reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          // Wait for the new service worker to activate
          await reg.update();
        }
        // Reload the page to use the new service worker
        if (reloadPage) {
          window.location.reload();
        }
      };

      // Set the updater initially
      setPwaUpdater(createUpdater(registration));

      // Check for updates periodically
      const checkForUpdates = () => {
        if (!registration) {
          return;
        }
        void registration.update().catch(() => {
          // Ignore update errors
        });
      };

      // Check for updates every 4 hours
      const updateInterval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000);

      // Set up update notification
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing || registration.waiting;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              // New update available - notify UI
              notifyPwaUpdateAvailable();
              // Re-set the updater with the updated registration reference
              setPwaUpdater(createUpdater(registration));
            }
          });
        }
      });

      // Clean up interval on pagehide
      window.addEventListener('pagehide', () => {
        clearInterval(updateInterval);
      });
    } catch {
      // Service worker registration failed, but that's okay
      // The app will still work, just without offline caching
    }
  })();
}

export function getServiceWorkerRegistration() {
  return serviceWorkerRegistration;
}
