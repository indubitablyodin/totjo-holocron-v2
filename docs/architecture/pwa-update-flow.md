# PWA Update Flow

## Why refreshing may not show new CSS/JS

When the app is served as a production build (via `pnpm build` + `pnpm preview` or deployed to GitHub Pages), the service worker (SW) precaches all JS, CSS, and HTML assets at build time. Once the SW is registered, it serves these precached assets even when the server has newer files.

A browser refresh fetches the page from the SW's cache, not the network. The server's newer `sw.js` may be downloaded by the browser, but the **new SW waits** until all tabs running the old SW are closed (or `skipWaiting()` is called). During this "waiting" window, the old SW continues to serve its precached (stale) assets.

## Lifecycle

```
Build → Precached assets (with content hashes)
   ↓
SW registered → Controls page → Serves precached assets
   ↓
Rebuild → New sw.js (different bytes)
   ↓
Browser detects update on next navigation/update() call
   ↓
New SW downloaded and installed → enters "waiting" state
   ↓
Old SW still controls page → stale JS/CSS served
   ↓
User clicks "Update now" → SKIP_WAITING message
   ↓
New SW activates (clientsClaim) → controls page
   ↓
Page reloads → new assets served by new SW
```

## Key files

| File | Purpose |
|------|---------|
| `src/sw.ts` | Service worker: precaching via workbox, SKIP_WAITING handler, navigation route with denylist |
| `src/app/registerAppServiceWorker.ts` | Registration, `registration.update()` polling (1 hour), visibility-based update check, `updatefound` listener |
| `src/app/pwaUpdate.ts` | External store for update state (updateAvailable, dismissed, isApplyingUpdate, errorMessage) |
| `src/app/AppShell.tsx` | Renders `app-update-card` when update is available: "Update now" / "Later" buttons |
| `vite.config.ts` | VitePWA plugin with `injectManifest` strategy |

## App shell cache vs user data

| Data type | Storage | Preserved on update |
|-----------|---------|-------------------|
| JS / CSS / HTML assets | Cache Storage (workbox-*) | Replaced on SW update |
| User notes, bookmarks, practice history | IndexedDB (appDb) | **Never touched by SW updates** |
| Reading settings, theme preference | localStorage | **Never touched by SW updates** |

**Do not clear all site data** to fix visual stale-cache issues — that wipes user notes, bookmarks, and practice history.

## Update UI

When a new SW is waiting, a non-blocking card appears at the top of the page:

> **New version ready**  
> A fresh Holocron is waiting...  
> [Update now] [Later]

- "Update now" posts `{ type: 'SKIP_WAITING' }` to the waiting SW, waits for the controller change, then reloads.
- "Later" dismisses the card until the next update check finds a new SW.

## Build marker

Settings > About & Legal shows the current build version and label:

> Version 0.1.0-rc.4-dev · Build local

This is the simplest way to confirm which build the browser is actually running.

## Check for update (manual)

Settings > About & Legal contains a "Check for app update" button that calls `registration.update()` and reports whether a new SW is waiting.

## Visibility-based update check

When the browser tab becomes visible (`visibilitychange` → `visible`), the app calls `registration.update()` to trigger an immediate SW update check. This means returning to a long-open tab after a deploy will detect the update quickly.

## Safe local reset

To force the latest build without losing user data:

1. Open devtools → Application → Service Workers
2. Click "Unregister" for the active SW
3. Open Application → Cache Storage → Delete all `workbox-*` caches
4. Reload the page

This preserves IndexedDB (notes, bookmarks, settings) and localStorage (theme, reading prefs) while forcing fresh assets.

## Dangerous reset — do not use

**Clearing all site data** in devtools → Application → Clear site data also wipes IndexedDB and localStorage. This destroys user notes, bookmarks, practice history, and settings. Only use this if you intentionally want a clean slate.

## Dev server (no SW)

The Vite dev server (`pnpm dev`) does not register a service worker. Changes appear on save via HMR. If HMR stalls, a hard refresh (Cmd+Shift+R) bypasses the browser's HTTP cache.

## How to test the update banner

1. Build and preview: `pnpm build && pnpm preview`
2. Open the app and confirm the SW is active (devtools → Application → Service Workers)
3. Make a visible change (e.g., increment `version` in `src/app/buildInfo.ts`)
4. Rebuild: `pnpm build`
5. Refresh the app in the browser
6. Wait a few seconds for the browser to detect the new SW
7. The update card should appear: "New version ready"
8. Click "Update now"
9. Confirm the build version in Settings > About has changed
