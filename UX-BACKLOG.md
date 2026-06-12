# UX Backlog — TOTJO Holocron v2

**Last updated:** 2026-06-12

---

## Status Summary

| Item | PR | Status | Deployed |
|------|----|--------|----------|
| Bottom nav / Back accessibility sizing | #19 | ✅ Done | ✅ |
| Timer inline controls + duration edit | #20 | ✅ Done | ✅ |
| Gear icons for feature settings | #20 | ✅ Done (batched) | ✅ |
| Library compact nav + collapsible lanes | #21 | ✅ Done | ✅ |
| Timer duration phantom zeroes | #22 | ✅ Done | ✅ |
| Stale PWA recovery docs | — | ⏳ Not started | — |
| Reader gear icon | — | 📋 Open | — |
| Reader inline sticky toolbar | — | 📋 Open | — |
| Settings save confirmation toast | — | 📋 Open | — |
| Conditional offline banner render | — | 📋 Open | — |

---

## Completed Items

### Bottom nav / Back accessibility sizing (PR #19)
- Added `min-height: 2.75rem` to bottom nav links and Back button
- Ensures ~44px minimum tap target at 16px root font
- All values use `rem` so they scale with browser font-size

### Timer inline controls + duration editing (PR #20)
- Removed expandable "Session setup" panel
- Bell mode, bell sound, test bell, save history always visible inline
- Tap idle clock to edit duration directly
- Gear icon → `/settings/timer-defaults`
- Added `headerActions` prop to `PageLayout`

### Library compact navigation + collapsible lanes (PR #21)
- Metric cards replaced with compact nav chips: Doctrine, Supplemental, Sermons, Bookmarks
- Search hidden behind toggle button
- Doctrine lane open by default; Supplemental and Sermons collapsed
- Bookmarks count badge on nav chip

### Timer duration input phantom zeroes (PR #22)
- React `type="number"` cursor-jump bug caused phantom digits
- Fixed: `type="text"` + `inputMode="numeric"` with explicit `parseInt`

---

## Open Items

### Stale PWA recovery (docs)
**Severity:** Low
Recovery steps for users with old cached SW: uninstall → clear site data → reinstall. Already hardened by SW navigation denylist (PR #16).

### Reader gear icon
**Severity:** Low
Add `⚙` icon linking to `/settings/reading-display` on the doctrine reader page. Requires extending `CompactReaderShell` with a `headerActions` prop.

### Reader inline sticky toolbar
**Severity:** Medium
Reader display controls (theme, font scale) require multi-step interaction. Move to a sticky inline toolbar.

### Settings save confirmation toast
**Severity:** Low
Settings save silently. Add a subtle "Saved" toast (2s auto-dismiss) after writes complete.

### Conditional offline banner
**Severity:** Low
Offline banner is always in DOM via `hidden` attribute. Use conditional render + `aria-live="polite"`.
