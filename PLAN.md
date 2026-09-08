# PLAN: Audio-driven guided meditation sessions

## Goal

Make guided meditation a first-class timer experience:

- A guided session is its own session kind (`timed | guided`), not a timed
  countdown with a frozen duration.
- The timer stops when the guided file actually ends (media `ended` event),
  with the existing wall-clock countdown to the file's duration kept as a
  fail-safe so a session never hangs.
- Settings offers one "Default timer sound" selector: bundled sound profiles
  OR any uploaded guided file. Choosing a guided file makes new timers open
  in guided mode (duration locked to the file, bells optional via the
  existing overlay toggle).

## Decisions

- New `kind: 'timed' | 'guided'` on `TimerSessionState` / `TimerConfigUpdate`;
  persisted in the stored session, no preference-schema migration.
- `TimerPreferences` shape unchanged (`defaultSoundProfileId`,
  `defaultGuidedAudioFileId`, `guidedCueOverlay`); the unification is a UI concern.
- Completion via audio `ended` calls a new `completeNow()` on `useTimerSession`
  (phase → complete, fires `onCue('complete')`, records history once, guarded
  against the countdown racing to the same completion).
- Guided sessions never play interval cues even if a custom bell mode is
  configured; only the start/complete gong overlay applies (`guidedCueOverlay`).
- Dashboard (`DashboardTimer`) stays timed-only; it already ignores guided.

## File changes

1. `src/features/timer/timerModel.ts` — `TimerSessionKind`, `kind` in session
   and config updates, default from prefs, hydrate validation (guided requires
   a file id), `applyEditableTimerConfig` clears guided file when kind→timed,
   guided interval suppression in `advanceTimerSession`, export
   `completeTimerSession`.
2. `src/features/timer/useTimerSession.ts` — `kind` in initial/reset state;
   new `completeNow()` API.
3. `src/features/timer/TimerPage.tsx` — `useAudioElements` gains an
   `onGuidedEnded` callback (ref-stable listener); `completeNow` wired in;
   `isGuidedMode` derived from `session.kind`; mode/select handlers set kind
   and duration; "Session type" row in details.
4. `src/features/settings/SettingsPanels.tsx` — replace "Default bell sound"
   + "Default guided audio" with one "Default timer sound" select
   (`setting-timer-sound-profile`), profile values unchanged, guided files as
   `guided:<id>` options; overlay toggle gated on a guided default.
5. Tests — `meditation-timer.test.tsx` (kind/interval/hydrate/completeTimerSession),
   `guided-audio-timer.test.tsx` (session-kind detail, audio `ended` completes and
   records history), settings selector mapping in `audio-rights.test.tsx`; e2e
   `guided-audio.spec.ts` uses the unified selector.
6. `docs/adr/0007-audio-driven-guided-meditations.md` — ADR.

## Status

All implementation chunks are complete. Validation status below.

## Validation

- `pnpm lint` — 23 problems (22 errors + 1 warning), identical to baseline
  (the lone pre-existing `TimerPage` react-hooks error moved from line 363 to 390).
- `pnpm typecheck` — clean.
- `pnpm test` — 46 files, 283 tests passed (baseline 275 + 8 new).
- `pnpm build` — pending final run.
- `pnpm test:e2e` — pending final run.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — full CI sequence pending.