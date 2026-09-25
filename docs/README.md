# Documentation Map

Start here. This indexes everything under `docs/` plus the root-level project docs, and says
which ones are live/current vs. historical, so you don't have to guess.

## Read first

- **[`architecture/known-issues-and-fixes.md`](architecture/known-issues-and-fixes.md)** — what's
  broken and been fixed before, what's broken and still open, and cascade/coupling patterns that
  keep causing repeat bugs (CSS ordering, the three-timer-surfaces split, the two "update" systems).
  Check this before touching nav, timer, announcements, or `styles.css`.
- **`../AGENTS.md`** — stack, versions, commands, file layout conventions.

## `docs/adr/` — accepted architectural decisions

Numbered, never renumbered, status is always "Accepted" once merged (this project doesn't use
Proposed/Rejected states — a decision either shipped or the ADR was never written). None have been
reversed by later code as of 2026-09-09.

| ADR | Decision |
|---|---|
| 0001-stack.md | Core stack: pnpm/Vite/React/TS/Router/Dexie/Supabase/Vitest/Playwright/GH Actions; content governance lives in-repo |
| 0002-offline-policy.md | Offline is only guaranteed after first online load; doctrine is bundled, sermons are offline-readable only once downloaded and provenance-approved |
| 0003-content-authority.md | Three authority classes — `canonical`/`supplemental`/`sermon` — with provenance/approval tracked in `content/policy/content-authority.json` |
| 0004-sync-model.md | Anonymous by default; optional Supabase account sync covers only user-owned state, never rewrites source text |
| 0005-text-personalization.md | Personalization (pronoun display, etc.) is presentation-layer only — original text is never mutated or persisted |
| 0006-custom-user-documents.md | Added the `custom` authority class + `user` origin for My Documents — local-only, exported but not synced |
| 0007-audio-driven-guided-meditations.md | Timer sessions carry a `kind: 'timed' \| 'guided'`; guided completion is driven by the audio file's `ended` event, with a countdown fail-safe |

## `docs/architecture/` — how specific systems work

| Doc | Covers | Status |
|---|---|---|
| `known-issues-and-fixes.md` | Cross-cutting bug/fix history and open issues | Live — update when you fix or find something non-obvious |
| `announcements.md` | The in-app content-notice system (badge/banner/modal, bundled + `public/announcements.json` feed) | Live, accurate as of 2026-09-09 |
| `pwa-update-flow.md` | The separate service-worker app-code update banner — **not** the same system as announcements.md, see either doc's disambiguation section | Live, accurate as of 2026-09-09 |
| `user-data-export.md` | Markdown/JSON export, JSON restore (preview implemented; apply/write step is not) | Live; sections are labeled implemented vs. design-intent |
| `decentralized-community.md` | Long-term local-first/federation vision and phased roadmap | Live roadmap doc, not a status report — check the phase status tables for what's actually shipped |
| `library-search-model.md` | Search pipeline naming and structure | Live |
| `reference-app-lessons.md` | Anti-patterns and lessons pulled from reference apps | Live, general-purpose |
| `visual-identity.md` | Theme tokens and visual design language | Live |
| `browser-support.md` | Baseline vs. enhanced feature tiers, per-browser notes | Live |

## `docs/audit/` — point-in-time audits (historical by design)

Dated snapshots (2026-06-23 through 2026-06-29): `pwa-offline-audit.md`, `release-readiness.md`,
`dependency-security-v0.1.0.md`, `v0.1.0-final-acceptance.md`, `v0.1.0-rc.3-acceptance.md`,
`v0.1.0-rc.4-visual-accessibility.md`, plus a `visual-identity/` screenshot tree from several
iteration passes. These are correctly self-dated as history — don't read them as current state,
and don't feel obligated to "update" them; that's what makes them useful as a record.

## `docs/releases/` — release notes

`v0.1.0-rc.1.md` through `v0.1.1.md`, plus the current `v0.1.7.md` release notes. **Gap:** git tags
`v0.1.2` through `v0.1.6` have no corresponding release-notes files. If you're doing historical
release work, that's an opening to fill, not evidence those versions didn't ship.

## `docs/ux/`

- `mobile-first-ia-contract.md` — locks the 4 top-level nav destinations, their labels, and a
  copy/control-placement inventory. Amended 2026-09-09 (see the doc's own amendment note) after
  the shipped `/daily` label ("Focus") was found to have silently diverged from what the contract
  originally locked ("Today"). Nothing enforces this doc against the code automatically — when you
  touch `AppShell.tsx`'s nav, check this file by hand.

## Root-level docs (historical, superseded)

`UI-AUDIT-REPORT.md` and `UX-BACKLOG.md` are both frozen at 2026-06-12 and now carry a banner
saying so. Real UX work has landed since that they don't reflect — treat
`known-issues-and-fixes.md` as the current source for "what's been fixed," not these two.

`PLAN.md` is the (still-current, as of `c3333b3`) implementation plan for ADR-0007.

## `.vibe-work/` — auto-generated project primer

`architecture.md`, `commands.md`, `learnings.md`, `roadmap.md`, `validation.md` — generated by a
`/prep`-style tool on 2025-05-01 and not regenerated since. Spot-checked and corrected in place on
2026-09-09 where found stale (see each file's header note); not everything in every file has been
re-verified line by line. If you have the tool that generates these, regenerating is probably
better than continuing to hand-patch them.

## Keeping this current

When you fix a non-obvious bug, add it to `known-issues-and-fixes.md`'s fix history — not just a
commit message. When you find a doc that's actively wrong (not just old), fix the specific claim
or add a note; you don't need permission to correct a false statement in a doc that isn't marked
historical. When you add a new architecture doc under `docs/architecture/`, add a row to the table
above.
