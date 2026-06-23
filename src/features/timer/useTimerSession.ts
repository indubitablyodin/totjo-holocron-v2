import { useCallback, useEffect, useRef, useState } from 'react';

import {
  advanceTimerSession,
  formatTimerClock,
  pauseTimerSession,
  resetTimerSession,
  resumeTimerSession,
  startTimerSession,
  type TimerSessionState,
} from '@/features/timer/timerModel';

export type TimerCompletionEvent = {
  durationSeconds: number;
  completedAt: string;
};

export type TimerCueEvent = 'start' | 'pause' | 'resume' | 'complete';

type UseTimerSessionOptions = {
  defaultDurationMinutes?: number;
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
};

export function useTimerSession({
  defaultDurationMinutes = 15,
  onComplete,
  onCue,
}: UseTimerSessionOptions): TimerSessionAPI {
  const [session, setSession] = useState<TimerSessionState>(() => {
    const seconds = defaultDurationMinutes * 60;

    return {
      phase: 'idle',
      totalDurationSeconds: seconds,
      remainingSeconds: seconds,
      cueMode: 'start-end',
      intervalSeconds: 0,
      soundProfileId: 'silent',
      recordPracticeHistory: true,
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
  };
}
