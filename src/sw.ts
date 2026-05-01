/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | import('workbox-precaching').PrecacheEntry>;
};

self.addEventListener('message', (event) => {
  if (event.data && typeof event.data === 'object' && 'type' in event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`), {
    denylist: [/^\/api\//],
  }),
);
