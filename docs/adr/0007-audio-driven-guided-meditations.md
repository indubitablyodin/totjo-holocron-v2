# 0007. Audio-driven guided meditation sessions

## Status
Accepted

## Context
Guided meditation audio lets users follow a recorded session while the same timer tracks their sitting time. Previously, guided mode froze a timed countdown at the file's metadata duration and completed on wall-clock time alone, so the timer did not actually track the file playback. Users also had to set "default cue sound" and "default guided audio" in two separate places, making it unclear how a guided file and the timer sound interact.

## Decision
- A timer session now carries a `kind` of `timed` or `guided`, stored on the persisted session (key `totjo-holocron:timer-session`). No preference-schema migration is needed.
- Guided sessions complete from playback: the guided audio element's `ended` event calls `completeNow()` on the timer session hook, which finalizes the session, records practice history, and fires the complete cue. A fail-safe keeps the countdown-driven completion path so a file that never fires `ended` cannot hang the timer.
- `completeNow()` is guarded to only act while the session is `running`, and the guarded `completeTimerSession` transition is exported from the timer model.
- Guided sessions never emit interval reminder cues. Start/complete gongs still play when the `guidedCueOverlay` preference is enabled.
- The settings screen consolidates the two separate selectors into one "Default timer sound" field. Sound-profile options keep their raw ids (`silent`, `default-gong`, ...) while guided files are exposed as `guided:<fileId>` values. Choosing a profile clears the guided default; choosing a guided file becomes the session's default kind and duration lock.
- The dashboard timer remains timed-only.

## Consequences
- The timer reliably ends with the guided file and still completes if the audio fails to signal an end.
- One canonical setting answers "what should a new timer sound like?", removing the ambiguity between bells and guided audio.
- Tests cover the guided completion path (unit: audio `ended` completes and records history; e2e: a 2-second uploaded WAV drives the timer to Complete).