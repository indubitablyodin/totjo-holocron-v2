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
import { recordMeditationPractice } from '@/features/timer/timerHistory';

type DashboardTimerProps = {
  defaultDurationMinutes?: number;
};

export function DashboardTimer({ defaultDurationMinutes = 15 }: DashboardTimerProps) {
  const [durationMinutes, setDurationMinutes] = useState(defaultDurationMinutes);
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
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(20);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const persistCompletion = useCallback(async (completedSession: TimerSessionState) => {
    if (completedSession.historyRecorded || !completedSession.recordPracticeHistory) {
      return;
    }

    await recordMeditationPractice({
      completedAt: new Date(completedSession.completedAtMs ?? Date.now()).toISOString(),
      durationSeconds: completedSession.totalDurationSeconds,
    });

    setSession((currentSession) => {
      if (currentSession.historyRecorded) {
        return currentSession;
      }

      return { ...currentSession, historyRecorded: true };
    });
  }, []);

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
        void persistCompletion(result.session);
      }
    };

    syncTimer();
    const intervalId = window.setInterval(syncTimer, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [persistCompletion, session.phase]);

  const handleStart = (minutes: number) => {
    const seconds = minutes * 60;
    setSession((currentSession) => {
      const configured = { ...currentSession, totalDurationSeconds: seconds, remainingSeconds: seconds };
      return startTimerSession(configured, Date.now());
    });
    setDurationMinutes(minutes);
  };

  const handlePause = () => {
    setSession((currentSession) => pauseTimerSession(currentSession, Date.now()));
  };

  const handleResume = () => {
    setSession((currentSession) => resumeTimerSession(currentSession, Date.now()));
  };

  const handleStop = () => {
    setSession((currentSession) => resetTimerSession(currentSession));
  };

  const isIdle = session.phase === 'idle';
  const isRunning = session.phase === 'running';
  const isPaused = session.phase === 'paused';
  const isComplete = session.phase === 'complete';

  return (
    <div className="dashboard-timer" data-testid="dashboard-meditation-timer">
      {isIdle || isComplete ? (
        <>
          <div className="timer-presets" data-testid="meditation-presets">
            <button
              className="timer-preset-btn"
              data-testid="meditation-preset-5"
              onClick={() => {
                handleStart(5);
              }}
              type="button"
            >
              <span className="timer-preset-num">5</span>
              <span className="timer-preset-label">min</span>
            </button>
            <button
              className="timer-preset-btn"
              data-testid="meditation-preset-10"
              onClick={() => {
                handleStart(10);
              }}
              type="button"
            >
              <span className="timer-preset-num">10</span>
              <span className="timer-preset-label">min</span>
            </button>
            <button
              className="timer-preset-btn"
              data-testid="meditation-preset-15"
              onClick={() => {
                handleStart(15);
              }}
              type="button"
            >
              <span className="timer-preset-num">15</span>
              <span className="timer-preset-label">min</span>
            </button>
          </div>

          <button
            className="timer-custom-trigger"
            data-testid="meditation-custom-trigger"
            onClick={() => {
              setShowCustom(!showCustom);
            }}
            type="button"
          >
            {showCustom ? 'Cancel' : 'Custom time'}
          </button>

          {showCustom ? (
            <div className="timer-custom-input" data-testid="meditation-custom-input">
              <input
                type="number"
                min="1"
                max="120"
                value={customMinutes}
                aria-label="Custom meditation minutes"
                onChange={(event) => {
                  setCustomMinutes(Math.max(1, Math.min(120, parseInt(event.target.value) || 1)));
                }}
              />
              <span className="timer-custom-unit">min</span>
              <button
                className="meditation-start-btn"
                data-testid="meditation-begin"
                onClick={() => {
                  handleStart(customMinutes);
                }}
                type="button"
              >
                Begin
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="dashboard-timer__readout" data-testid="timer-readout">
          {formatTimerClock(session.remainingSeconds)}
        </div>
      )}

      {isRunning || isPaused ? (
        <div className="dashboard-timer__controls">
          {isRunning ? (
            <button
              className="secondary-button button-inline"
              data-testid="timer-pause"
              onClick={handlePause}
              type="button"
            >
              Pause
            </button>
          ) : null}
          {isPaused ? (
            <button
              className="primary-button button-inline"
              data-testid="timer-resume"
              onClick={handleResume}
              type="button"
            >
              Resume
            </button>
          ) : null}
          <button
            className="secondary-button button-inline"
            data-testid="timer-stop"
            onClick={handleStop}
            type="button"
          >
            Stop
          </button>
        </div>
      ) : null}

      {isComplete ? (
        <p className="support-copy timer-complete-message" data-testid="timer-complete">
          Session complete.
        </p>
      ) : null}
    </div>
  );
}
