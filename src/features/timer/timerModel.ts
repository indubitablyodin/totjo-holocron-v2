import {
  DEFAULT_SOUND_PROFILE_ID,
  isSoundProfileId,
  type CueKind,
  type SoundProfileId,
} from '@/features/timer/audioProfiles';
import {
  DEFAULT_TIMER_PREFERENCES,
  isTimerCueMode,
  type TimerCueMode,
  type TimerPreferences,
} from '@/features/timer/timerPreferences';

export const TIMER_PHASES = ['idle', 'running', 'paused', 'complete'] as const;

export type TimerPhase = (typeof TIMER_PHASES)[number];

export type TimerSessionState = {
  phase: TimerPhase;
  totalDurationSeconds: number;
  remainingSeconds: number;
  cueMode: TimerCueMode;
  intervalSeconds: number;
  soundProfileId: SoundProfileId;
  recordPracticeHistory: boolean;
  targetEndAtMs: number | null;
  lastIntervalIndex: number;
  historyRecorded: boolean;
  completedAtMs: number | null;
};

export type TimerConfigUpdate = {
  totalDurationSeconds: unknown;
  cueMode: TimerCueMode;
  intervalSeconds: unknown;
  soundProfileId: SoundProfileId;
  recordPracticeHistory: boolean;
};

export type AdvanceTimerResult = {
  session: TimerSessionState;
  changed: boolean;
  cueKind: CueKind | null;
  didComplete: boolean;
};

export const DEFAULT_TIMER_DURATION_SECONDS = 300;
const MIN_TIMER_DURATION_SECONDS = 1;
const MAX_TIMER_DURATION_SECONDS = 60 * 60 * 8;
const MAX_INTERVAL_SECONDS = 60 * 60;
const validTimerPhases = new Set<TimerPhase>(TIMER_PHASES);

function toSafeInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function clampTimerDurationSeconds(value: unknown): number {
  return Math.min(
    MAX_TIMER_DURATION_SECONDS,
    Math.max(MIN_TIMER_DURATION_SECONDS, toSafeInteger(value, DEFAULT_TIMER_DURATION_SECONDS)),
  );
}

function clampTimerDurationSecondsWithFallback(value: unknown, fallback: number): number {
  return Math.min(MAX_TIMER_DURATION_SECONDS, Math.max(MIN_TIMER_DURATION_SECONDS, toSafeInteger(value, fallback)));
}

export function clampIntervalSeconds(value: unknown): number {
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(0, toSafeInteger(value, 0)));
}

function clampIntervalSecondsWithFallback(value: unknown, fallback: number): number {
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(0, toSafeInteger(value, fallback)));
}

export function formatTimerClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function createDefaultTimerSession(preferences: TimerPreferences = DEFAULT_TIMER_PREFERENCES): TimerSessionState {
  return {
    phase: 'idle',
    totalDurationSeconds: preferences.defaultDurationSeconds,
    remainingSeconds: preferences.defaultDurationSeconds,
    cueMode: preferences.defaultCueMode,
    intervalSeconds: preferences.defaultIntervalSeconds,
    soundProfileId: preferences.defaultSoundProfileId,
    recordPracticeHistory: preferences.recordPracticeHistory,
    targetEndAtMs: null,
    lastIntervalIndex: 0,
    historyRecorded: false,
    completedAtMs: null,
  };
}

export function applyEditableTimerConfig(
  session: TimerSessionState,
  updates: Partial<TimerConfigUpdate>,
): TimerSessionState {
  const totalDurationSeconds =
    updates.totalDurationSeconds === undefined
      ? session.totalDurationSeconds
      : clampTimerDurationSeconds(updates.totalDurationSeconds);
  const cueMode = updates.cueMode === undefined ? session.cueMode : updates.cueMode;
  const intervalSeconds =
    cueMode !== 'custom'
      ? 0
      : updates.intervalSeconds === undefined
        ? session.intervalSeconds
        : clampIntervalSeconds(updates.intervalSeconds);
  const soundProfileId =
    updates.soundProfileId === undefined ? session.soundProfileId : updates.soundProfileId;
  const recordPracticeHistory =
    updates.recordPracticeHistory === undefined
      ? session.recordPracticeHistory
      : updates.recordPracticeHistory;

  return {
    ...session,
    phase: 'idle',
    totalDurationSeconds,
    remainingSeconds: totalDurationSeconds,
    cueMode,
    intervalSeconds,
    soundProfileId,
    recordPracticeHistory,
    targetEndAtMs: null,
    lastIntervalIndex: 0,
    historyRecorded: false,
    completedAtMs: null,
  };
}

export function hydrateStoredTimerSession(
  value: unknown,
  preferences: TimerPreferences = DEFAULT_TIMER_PREFERENCES,
  now = Date.now(),
): TimerSessionState {
  if (!isRecord(value)) {
    return createDefaultTimerSession(preferences);
  }

  const totalDurationSeconds = clampTimerDurationSecondsWithFallback(value.totalDurationSeconds, preferences.defaultDurationSeconds);
  const intervalSeconds = clampIntervalSecondsWithFallback(value.intervalSeconds, preferences.defaultIntervalSeconds);
  const baseSession: TimerSessionState = {
    phase: validTimerPhases.has(value.phase as TimerPhase) ? (value.phase as TimerPhase) : 'idle',
    totalDurationSeconds,
    remainingSeconds: Math.min(totalDurationSeconds, Math.max(0, toSafeInteger(value.remainingSeconds, totalDurationSeconds))),
    cueMode: isTimerCueMode(value.cueMode)
      ? value.cueMode
      : intervalSeconds > 0
        ? 'custom'
        : preferences.defaultCueMode,
    intervalSeconds,
    soundProfileId: isSoundProfileId(value.soundProfileId) ? value.soundProfileId : preferences.defaultSoundProfileId,
    recordPracticeHistory:
      typeof value.recordPracticeHistory === 'boolean'
        ? value.recordPracticeHistory
        : preferences.recordPracticeHistory,
    targetEndAtMs: typeof value.targetEndAtMs === 'number' && Number.isFinite(value.targetEndAtMs) ? value.targetEndAtMs : null,
    lastIntervalIndex: Math.max(0, toSafeInteger(value.lastIntervalIndex, 0)),
    historyRecorded: typeof value.historyRecorded === 'boolean' ? value.historyRecorded : false,
    completedAtMs: typeof value.completedAtMs === 'number' && Number.isFinite(value.completedAtMs) ? value.completedAtMs : null,
  };

  if (baseSession.phase === 'running') {
    return advanceTimerSession(baseSession, now).session;
  }

  if (baseSession.phase === 'complete') {
    return {
      ...baseSession,
      remainingSeconds: 0,
      targetEndAtMs: null,
      completedAtMs: baseSession.completedAtMs ?? now,
    };
  }

  if (baseSession.phase === 'idle') {
    return {
      ...baseSession,
      remainingSeconds: totalDurationSeconds,
      targetEndAtMs: null,
      completedAtMs: null,
      historyRecorded: false,
      lastIntervalIndex: 0,
    };
  }

  return {
    ...baseSession,
    targetEndAtMs: null,
    completedAtMs: null,
  };
}

export function shouldPlayTimerCue(session: Pick<TimerSessionState, 'cueMode'>, cueKind: CueKind): boolean {
  switch (session.cueMode) {
    case 'start-end':
      return cueKind === 'start' || cueKind === 'complete';
    case 'start-only':
      return cueKind === 'start';
    case 'end-only':
      return cueKind === 'complete';
    case 'custom':
      return cueKind === 'start' || cueKind === 'interval' || cueKind === 'complete';
  }
}

export function startTimerSession(session: TimerSessionState, now = Date.now()): TimerSessionState {
  return {
    ...session,
    phase: 'running',
    remainingSeconds: session.totalDurationSeconds,
    targetEndAtMs: now + session.totalDurationSeconds * 1000,
    lastIntervalIndex: 0,
    historyRecorded: false,
    completedAtMs: null,
  };
}

export function pauseTimerSession(session: TimerSessionState, now = Date.now()): TimerSessionState {
  if (session.phase !== 'running' || session.targetEndAtMs === null) {
    return session;
  }

  const remainingSeconds = Math.max(0, Math.ceil((session.targetEndAtMs - now) / 1000));

  if (remainingSeconds === 0) {
    return completeTimerSession(session, session.targetEndAtMs);
  }

  return {
    ...session,
    phase: 'paused',
    remainingSeconds,
    targetEndAtMs: null,
  };
}

export function resumeTimerSession(session: TimerSessionState, now = Date.now()): TimerSessionState {
  if (session.phase !== 'paused') {
    return session;
  }

  return {
    ...session,
    phase: 'running',
    targetEndAtMs: now + session.remainingSeconds * 1000,
    completedAtMs: null,
  };
}

export function resetTimerSession(session: TimerSessionState): TimerSessionState {
  return {
    ...session,
    phase: 'idle',
    remainingSeconds: session.totalDurationSeconds,
    targetEndAtMs: null,
    lastIntervalIndex: 0,
    historyRecorded: false,
    completedAtMs: null,
  };
}

function completeTimerSession(session: TimerSessionState, completedAtMs: number): TimerSessionState {
  return {
    ...session,
    phase: 'complete',
    remainingSeconds: 0,
    targetEndAtMs: null,
    completedAtMs,
  };
}

export function advanceTimerSession(session: TimerSessionState, now = Date.now()): AdvanceTimerResult {
  if (session.phase !== 'running' || session.targetEndAtMs === null) {
    return {
      session,
      changed: false,
      cueKind: null,
      didComplete: false,
    };
  }

  const remainingSeconds = Math.max(0, Math.ceil((session.targetEndAtMs - now) / 1000));

  if (remainingSeconds === 0) {
    const completedSession = completeTimerSession(session, session.targetEndAtMs);

    return {
      session: completedSession,
      changed: true,
      cueKind: 'complete',
      didComplete: !session.historyRecorded,
    };
  }

  const elapsedSeconds = session.totalDurationSeconds - remainingSeconds;
  const nextIntervalIndex =
    session.cueMode === 'custom' && session.intervalSeconds > 0
      ? Math.floor(elapsedSeconds / session.intervalSeconds)
      : session.lastIntervalIndex;
  const shouldPlayIntervalCue =
    session.cueMode === 'custom' &&
    session.intervalSeconds > 0 &&
    nextIntervalIndex > session.lastIntervalIndex &&
    elapsedSeconds < session.totalDurationSeconds;
  const nextSession: TimerSessionState = {
    ...session,
    remainingSeconds,
    lastIntervalIndex: Math.max(session.lastIntervalIndex, nextIntervalIndex),
  };

  return {
    session: nextSession,
    changed:
      nextSession.remainingSeconds !== session.remainingSeconds ||
      nextSession.lastIntervalIndex !== session.lastIntervalIndex,
    cueKind: shouldPlayIntervalCue ? 'interval' : null,
    didComplete: false,
  };
}

export function createTimerPreferencesFromSession(session: TimerSessionState): TimerPreferences {
  return {
    defaultDurationSeconds: session.totalDurationSeconds,
    defaultCueMode: session.cueMode,
    defaultIntervalSeconds: session.intervalSeconds,
    defaultSoundProfileId: isSoundProfileId(session.soundProfileId)
      ? session.soundProfileId
      : DEFAULT_SOUND_PROFILE_ID,
    recordPracticeHistory: session.recordPracticeHistory,
  };
}
