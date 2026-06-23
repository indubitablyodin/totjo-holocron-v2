import { useCallback, useEffect, useRef, useState } from 'react';

import { loadTimerPreferences } from '@/features/timer/timerPreferences';

import {
  advanceTimerSession,
  applyEditableTimerConfig,
  formatTimerClock,
  pauseTimerSession,
  resetTimerSession,
  resumeTimerSession,
  startTimerSession,
  type TimerConfigUpdate,
  type TimerSessionState,
} from '@/features/timer/timerModel';

export type TimerCompletionEvent = {
  durationSeconds: number;
  completedAt: string;
};

export type TimerCueEvent = 'start' | 'pause' | 'resume' | 'complete';

type UseTimerSessionOptions = {
  defaultDurationMinutes?: number;
  initialDurationSeconds?: number;
  initialSession?: Partial<TimerSessionState>;
  onComplete?: (event: TimerCompletionEvent) => void | Promise<void>;
  onCue?: (cue: TimerCueEvent) => void | Promise<void>;
};

export type TimerSessionAPI = {
  session: TimerSessionState;
  isIdle: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  clockDisplay: string;
  handleStart: (minutes: number) => void;
  handlePause: () => void;
  handleResume: () => void;
  handleStop: () => void;
  setDurationMinutes: (minutes: number) => void;
  handleReset: () => void;
  handleConfigUpdate: (updates: Partial<TimerConfigUpdate>) => void;
};

export function useTimerSession({
  defaultDurationMinutes = 15,
  initialDurationSeconds,
  initialSession,
  onComplete,
  onCue,
}: UseTimerSessionOptions): TimerSessionAPI {
  const [session, setSession] = useState<TimerSessionState>(() => {
    const seconds = initialDurationSeconds ?? defaultDurationMinutes * 60;

    return {
      phase: 'idle',
      totalDurationSeconds: seconds,
      remainingSeconds: seconds,
      cueMode: initialSession?.cueMode ?? 'start-end',
      intervalSeconds: initialSession?.intervalSeconds ?? 0,
      soundProfileId: initialSession?.soundProfileId ?? 'silent',
      recordPracticeHistory: initialSession?.recordPracticeHistory ?? true,
      targetEndAtMs: null,
      lastIntervalIndex: 0,
      historyRecorded: false,
      completedAtMs: null,
    };
  });
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const handleComplete = useCallback(
    async (completedSession: TimerSessionState) => {
      if (completedSession.historyRecorded) {
        return;
      }

      await onComplete?.({
        durationSeconds: completedSession.totalDurationSeconds,
        completedAt: new Date(completedSession.completedAtMs ?? Date.now()).toISOString(),
      });

      setSession((currentSession) => {
        if (currentSession.historyRecorded) {
          return currentSession;
        }
        return { ...currentSession, historyRecorded: true };
      });
    },
    [onComplete],
  );

  useEffect(() => {
    if (session.phase !== 'running') {
      return;
    }

    const syncTimer = () => {
      const currentSession = sessionRef.current;
      const result = advanceTimerSession(currentSession, Date.now());

      if (!result.changed && result.cueKind === null && !result.didComplete) {
        return;
      }

      setSession(result.session);

      if (result.didComplete) {
        void onCue?.('complete');
        void handleComplete(result.session);
      }
    };

    syncTimer();
    const intervalId = window.setInterval(syncTimer, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [handleComplete, onCue, session.phase]);

  const handleStart = useCallback(
    (minutes: number) => {
      const seconds = minutes * 60;
      setSession((currentSession) => {
        const configured = { ...currentSession, totalDurationSeconds: seconds, remainingSeconds: seconds };
        return startTimerSession(configured, Date.now());
      });
      void onCue?.('start');
    },
    [onCue],
  );

  const handlePause = useCallback(() => {
    setSession((currentSession) => pauseTimerSession(currentSession, Date.now()));
    void onCue?.('pause');
  }, [onCue]);

  const handleResume = useCallback(() => {
    setSession((currentSession) => resumeTimerSession(currentSession, Date.now()));
    void onCue?.('resume');
  }, [onCue]);

  const handleStop = useCallback(() => {
    setSession((currentSession) => resetTimerSession(currentSession));
  }, []);

  const setDurationMinutes = useCallback((minutes: number) => {
    const seconds = minutes * 60;
    setSession((currentSession) => ({
      ...currentSession,
      totalDurationSeconds: seconds,
      remainingSeconds: seconds,
    }));
  }, []);

  const handleConfigUpdate = useCallback((updates: Partial<TimerConfigUpdate>) => {
    setSession((currentSession) => applyEditableTimerConfig(currentSession, updates));
  }, []);

  const handleReset = useCallback(() => {
    const preferences = loadTimerPreferences();
    const seconds = preferences.defaultDurationSeconds;

    setSession((currentSession) => ({
      ...currentSession,
      phase: 'idle',
      totalDurationSeconds: seconds,
      remainingSeconds: seconds,
      cueMode: preferences.defaultCueMode,
      intervalSeconds: preferences.defaultIntervalSeconds,
      soundProfileId: preferences.defaultSoundProfileId,
      recordPracticeHistory: preferences.recordPracticeHistory,
      targetEndAtMs: null,
      lastIntervalIndex: 0,
      historyRecorded: false,
      completedAtMs: null,
    }));
  }, []);

  return {
    session,
    isIdle: session.phase === 'idle',
    isRunning: session.phase === 'running',
    isPaused: session.phase === 'paused',
    isComplete: session.phase === 'complete',
    clockDisplay: formatTimerClock(session.remainingSeconds),
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    setDurationMinutes,
    handleReset,
    handleConfigUpdate,
  };
}
