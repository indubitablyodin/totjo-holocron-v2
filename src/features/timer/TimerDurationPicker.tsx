import { type Dispatch, type SetStateAction } from 'react';

type TimerDurationPickerProps = {
  customMinutes: number;
  showCustom: boolean;
  onCustomMinutesChange: Dispatch<SetStateAction<number>>;
  onShowCustomChange: Dispatch<SetStateAction<boolean>>;
  onStart: (minutes: number) => void;
};

export function TimerDurationPicker({
  customMinutes,
  showCustom,
  onCustomMinutesChange,
  onShowCustomChange,
  onStart,
}: TimerDurationPickerProps) {
  return (
    <>
      <div className="timer-presets" data-testid="meditation-presets">
        <button
          className="timer-preset-btn"
          data-testid="meditation-preset-5"
          onClick={() => {
            onStart(5);
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
            onStart(10);
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
            onStart(15);
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
          onShowCustomChange(!showCustom);
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
              onCustomMinutesChange(Math.max(1, Math.min(120, parseInt(event.target.value) || 1)));
            }}
          />
          <span className="timer-custom-unit">min</span>
          <button
            className="meditation-start-btn"
            data-testid="meditation-begin"
            onClick={() => {
              onStart(customMinutes);
            }}
            type="button"
          >
            Begin
          </button>
        </div>
      ) : null}
    </>
  );
}
