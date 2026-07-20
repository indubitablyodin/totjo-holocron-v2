# TOTJO Holocron v2 — UI/UX Audit Report

**Date:** 2026-06-12  
**Audit scope:** All primary routes on desktop (1440×1024) + mobile Pixel 5 (393×851)  
**Validator:** `pnpm lint` ✅ | `pnpm typecheck` ✅ | `pnpm test` ✅ (78/78) | `pnpm build:pages` ✅

Screenshots captured at `desktop-*.png` and `mobile-*.png`.

---

## Top 10 Issues

### 1. [CRITICAL] Primary nav icon dump on mobile below 40rem

**Route:** All routes  
**Device:** Mobile Pixel 5  
**Evidence:** At 393px width, the primary navigation wheel renders a raw string of ~36 unicode icon characters (`☼ ✦ ◴ ⚙ ✧ ◈ ☰ ❋ ◫ ☼ ⏳ ◎...`) instead of a navigable menu. All link labels are suppressed, leaving only undifferentiated symbols. The bottom nav simultaneously shows only 4 items (Back / Focus / Library / Settings), omitting Timer, so there is no visual path to the Timer page on mobile.
**Severity:** Critical — Timer is unreachable via bottom nav, and the primary nav is illegible.
**Fix:** Either (a) add Timer to the bottom nav on small viewports, or (b) show label text alongside icons in the primary nav below 40rem. The primary nav wheel is designed for desktop; mobile needs a simplified tap-target row with labels.
**PR slice:** `src/styles.css` — add mobile label rendering in `.nav-wheel` at widths <40rem. `src/app/AppShell.tsx` — add Timer link to bottom-nav when viewport is small.

### 2. [HIGH] Header height consumes ~30% of mobile viewport

**Route:** All routes  
**Device:** Mobile Pixel 5  
**Evidence:** The header contains three visual layers: (1) brand block — title + subtitle, (2) creator-support links (home + Ko-fi), (3) install-cta button. On a 851px viewport this leaves roughly 600px for content. Combined with the bottom-nav (40px) and offline-banner (variable), content area is squeezed.
**Severity:** High — reduces reading/meditation real estate.
**Fix:** Collapse the creator-support block into a single icon + overflow menu on mobile. Move install-cta behind a menu or suppress it until the `beforeinstallprompt` event fires.
**PR slice:** `src/AppShell.tsx` — conditional render of creator links based on viewport width or a dedicated CSS media query in `src/styles.css`.

### 3. [HIGH] Sermons page hard-limits to 7 visible cards with no "show all" affordance

**Route:** `/library/sermons`  
**Device:** Both  
**Evidence:** The `SermonsPage` filters `sermons.slice(0, 7)` in a `useMemo`. At the current archive size (10 sermons), 3 are hidden with no button to expand or paginate. No loading indicator during the initial sync fetch.
**Severity:** High — users cannot discover 30% of the archive without knowing the exact slug.
**Fix:** Remove the `slice(0,7)` limit or add a "Show all" toggle. Add a brief loading skeleton during initial `syncSermonArchive` fetch.
**PR slice:** `src/features/sermons/SermonsPage.tsx` — replace `slice(0,7)` with a `visibleCount` state that reveals all on click.

### 4. [HIGH] Reader controls require a 3-step interaction to change display settings

**Route:** `/library/doctrine/*`  
**Device:** Both  
**Evidence:** Reader display controls (theme, font scale) are behind a multi-step panel. The user must: (1) tap/click a control-panel trigger, (2) tap a setting toggle, (3) dismiss the panel. No persistent toolbar or swipe gesture.
**Severity:** High — friction for a primary reading action (font sizing, dark mode).
**Fix:** Add a sticky reader toolbar with immediate-toggle buttons (theme, font scale presets) that stays visible without a multi-step dismiss pattern.
**PR slice:** `src/features/reader/ReaderControls.tsx` — replace multi-step panel with inline sticky toolbar.

### 5. [MEDIUM] Timer defaults to a utilitarian "session setup" page instead of a calm meditation-first view

**Route:** `/timer`  
**Device:** Both  
**Evidence:** The default timer screen shows session setup controls (duration presets, start button) with meditation stats below. No ambient state, breathing guide, or "pre-meditation" wind-down. The quick-preset buttons are the most prominent element.
**Severity:** Medium — contradicts the meditation-first purpose; utility over calm.
**Fix:** Default to a centered, minimal timer display. Move duration presets to a collapsible setup panel. Add a 3-second settle countdown after tapping Start.
**PR slice:** `src/features/timer/TimerPage.tsx` — reorder: timer display → collapsible setup → stats.

### 6. [MEDIUM] Settings save without any confirmation affordance

**Route:** `/settings/*`  
**Device:** Both  
**Evidence:** All settings persist automatically on change (theme toggle, font scale, focus slot, timer defaults). No toast, checkmark, or "Saved" indicator appears. Users cannot tell whether a change took effect, especially on slow IndexedDB writes.
**Severity:** Medium — undermines trust in the offline persistence layer.
**Fix:** Show a subtle "Saved" toast (2s auto-dismiss) after each settings write completes. Use a debounced save to avoid toast storms.
**PR slice:** `src/features/settings/` — add a generic `useSettingSaveToast` hook and toast component.

### 7. [MEDIUM] Offline banner is always rendered but hidden with `hidden` attribute

**Route:** All routes  
**Device:** Both  
**Evidence:** The offline-banner `<div hidden>` is always in the DOM tree. On mobile this is a 2-line status message that, when visible, pushes content down. The `hidden` attribute means screen-readers may still announce it.
**Severity:** Medium — unnecessary DOM weight, edge-case accessibility issue.
**Fix:** Conditionally render the banner only when offline (`!== null || undefined` guard). Use `aria-live="polite"` instead of `role="status"` for dynamic announcements.
**PR slice:** `src/app/AppShell.tsx` — replace `hidden` attribute with conditional render.

### 8. [MEDIUM] "Refresh sermons" button has no loading/error distinction on first load

**Route:** `/library/sermons`  
**Device:** Both  
**Evidence:** When no sermons are cached and the page loads, the `syncStatus` starts as `{ kind: 'idle', message: 'Connect to load…' }`. The "Refresh sermons" button is always shown, but on first load there's no distinction between "loading for the first time" vs "refreshing existing data". A failed initial sync shows `Could not update sermons` even if no sermons were ever loaded.
**Severity:** Medium — ambiguous error state for new users.
**Fix:** Track an `initialLoad` vs `refresh` state. Show a skeleton placeholder during initial sync. Differentiate "Could not load" from "Could not refresh."
**PR slice:** `src/features/sermons/SermonsPage.tsx` — add `initialLoad` boolean, skeleton UI.

### 9. [LOW] Back button in bottom nav persists even when there is no history

**Route:** All routes, root  
**Device:** Both  
**Evidence:** The bottom-nav "Back" button is always rendered as `<button>` (not `<Link>`). When the route stack is empty (fresh load to `/daily`), pressing Back logs a warning and does nothing. The button has no disabled state.
**Severity:** Low — harmless on desktop, slightly confusing on mobile.
**Fix:** Disable the Back button when the route stack has no previous entries. Use `aria-disabled` and reduce opacity.
**PR slice:** `src/app/AppShell.tsx` — gate Back button on `window.history.length > 1`.

### 10. [LOW] Service worker manifest.webmanifest has a syntax error in preview

**Route:** App shell  
**Device:** Both  
**Evidence:** Browser console logs `Manifest: Line: 1, column: 1, Syntax error` for `manifest.webmanifest`. This may be a Vite preview build artifact — the production deploy should be checked.
**Severity:** Low — does not break functionality, but prevents "Add to Home Screen" prompt in some browsers.
**Fix:** Verify the built `dist/manifest.webmanifest` file is valid JSON. The issue may be a missing `.webmanifest` content-type mapping in the preview server.
**PR slice:** `vite.config.ts` or check `dist/manifest.webmanifest` after build.

---

## Summary by Route

| Route | Impression | Navigation Clarity | Primary Action | Mobile Ergonomics | Offline/PWA |
|-------|-----------|-------------------|---------------|-------------------|-------------|
| `/daily` | Clean, purposeful | Good — bottom nav Daily is default | Clear "Begin meditation" + "Read" link | ❌ Header heavy; primary nav icons unlabeled | Stats persist; reading cached |
| `/library` | Feature-rich | Good — subnav for each content type | Clear entry points | ❌ Same header + nav issues | Content cached via Dexie |
| `/library/sermons` | Sparse | Good — back + breadcrumbs | "Refresh sermons" ambiguous | ⚠️ 7-card limit | Sync-then-save flow works |
| Sermon detail | Minimalist | Good | "Save for offline" | OK | Loads from network; saves locally |
| Doctrine reader | Focused | Good | Reader controls hidden ⚠️ | OK — font scale works | Full doctrine bundled offline |
| `/timer` | Too utilitarian | ❌ Timer not in bottom nav | Start button prominent | ⚠️ No bottom-nav path to Timer | History persisted |
| `/settings` | Compact, grouped | Excellent — IA is well-organized | Changes save silently | OK — scrollable groups | All settings persisted |

## Offline/PWA Assessment

- All core doctrine content is bundled and available offline ✅
- Sermon content requires an initial sync then works offline ✅
- Settings persist locally and sync when signed in ✅
- Service worker route denial now covers `/imports/`, `/assets/`, `/icons/` to prevent stale navigation fallback ✅
- **Remaining gap:** First-time offline experience is poor — no offline fallback content for sermons before sync.
- **Remaining gap:** No "You are offline" proactive guidance; banner is hidden until `window.online` flips.

## Recommended PR Order

1. **Timer in bottom nav + primary nav labels on mobile** (fixes issues 1, 5)
2. **Sermons show-all toggle** (fixes issue 3)
3. **Header compact on mobile** (fixes issue 2)
4. **Reader inline toolbar** (fixes issue 4)
5. **Save confirmation toast** (fixes issue 6)
6. **Conditional offline banner** (fixes issue 7)
7. **Polishes (Back disable, manifest, skeleton loaders)** (fixes issues 8, 9, 10)
