type TimerControlsProps = {
  isRunning: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export function TimerControls({
  isRunning,
  isPaused,
  onPause,
  onResume,
  onStop,
}: TimerControlsProps) {
  return (
    <div className="dashboard-timer__controls">
      {isRunning ? (
        <button
          className="secondary-button button-inline"
          data-testid="timer-pause"
          onClick={onPause}
          type="button"
        >
          Pause
        </button>
      ) : null}
      {isPaused ? (
        <button
          className="primary-button button-inline"
          data-testid="timer-resume"
          onClick={onResume}
          type="button"
        >
          Resume
        </button>
      ) : null}
      <button
        className="secondary-button button-inline"
        data-testid="timer-stop"
        onClick={onStop}
        type="button"
      >
        Stop
      </button>
    </div>
  );
}
