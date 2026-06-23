import { useState } from 'react';
import { useTimerSession, type TimerCompletionEvent } from './useTimerSession';
import { TimerDurationPicker } from './TimerDurationPicker';
import { TimerControls } from './TimerControls';

export type TimerCoreProps = {
  mode?: 'compact' | 'full';
  defaultDurationMinutes?: number;
  source: 'daily-dashboard' | 'timer-page';
  onComplete?: (event: TimerCompletionEvent) => void | Promise<void>;
  onCue?: (cue: 'start' | 'pause' | 'resume' | 'complete') => void | Promise<void>;
};

export function TimerCore({
  mode = 'compact',
  defaultDurationMinutes = 15,
  onComplete,
  onCue,
}: TimerCoreProps) {
  const [customMinutes, setCustomMinutes] = useState(20);
  const [showCustom, setShowCustom] = useState(false);

  const {
    session,
    isIdle,
    isRunning,
    isPaused,
    isComplete,
    clockDisplay,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
  } = useTimerSession({ defaultDurationMinutes, onComplete, onCue });

  const isIdleOrComplete = isIdle || isComplete;

  return (
    <div className="dashboard-timer" data-testid="dashboard-meditation-timer">
      {isIdleOrComplete ? (
        <TimerDurationPicker
          customMinutes={customMinutes}
          showCustom={showCustom}
          onCustomMinutesChange={setCustomMinutes}
          onShowCustomChange={setShowCustom}
          onStart={handleStart}
        />
      ) : (
        <div className="dashboard-timer__readout" data-testid="timer-readout">
          {clockDisplay}
        </div>
      )}

      {isRunning || isPaused ? (
        <TimerControls
          isRunning={isRunning}
          isPaused={isPaused}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
      ) : null}

      {isComplete ? (
        <p className="support-copy timer-complete-message" data-testid="timer-complete">
          Session complete.
        </p>
      ) : null}

      {mode === 'full' ? (
        <details className="timer-session-details">
          <summary>Session details</summary>
          <dl className="detail-list">
            <div>
              <dt>Duration</dt>
              <dd>{session.totalDurationSeconds}s</dd>
            </div>
            <div>
              <dt>Phase</dt>
              <dd>{session.phase}</dd>
            </div>
          </dl>
        </details>
      ) : null}
    </div>
  );
}
