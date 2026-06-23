import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { loadTimerSettings, saveTimerSettings, type TimerSettings } from '@/features/timer/timerSettingsStorage';

type TimerSettingsPanelProps = {
  isOpen: boolean;
  onSettingsChange?: (settings: TimerSettings) => void;
};

export function TimerSettingsPanel({ isOpen, onSettingsChange }: TimerSettingsPanelProps) {
  const [settings, setSettings] = useState<TimerSettings>(loadTimerSettings);

  const update = useCallback(
    (patch: Partial<TimerSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      saveTimerSettings(next);
      onSettingsChange?.(next);
    },
    [settings, onSettingsChange],
  );

  return (
    <div
      className="timer-settings-panel"
      data-testid="dashboard-timer-settings-panel"
      hidden={!isOpen}
      id="dashboard-timer-settings"
    >
      <label className="field-card">
        <span className="field-label">Default duration</span>
        <select
          className="field-select"
          value={settings.defaultDurationMinutes}
          onChange={(event) => {
            update({ defaultDurationMinutes: Number(event.target.value) });
          }}
        >
          {[5, 10, 15, 20, 30, 45, 60].map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} min
            </option>
          ))}
        </select>
      </label>

      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={settings.recordPracticeHistory}
          onChange={(event) => {
            update({ recordPracticeHistory: event.target.checked });
          }}
        />
        <span>Save meditation history</span>
      </label>

      <p className="support-copy">
        <Link to="/settings/timer-defaults">More timer settings</Link>
      </p>
    </div>
  );
}
