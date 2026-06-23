import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SOUND_PROFILES } from '@/features/timer/audioProfiles';
import { TIMER_CUE_MODES, type TimerCueMode } from '@/features/timer/timerPreferences';
import {
  loadTimerSettings,
  saveTimerSettings,
  type TimerSettings,
} from '@/features/timer/timerSettingsStorage';

const CUE_MODE_LABELS: Record<TimerCueMode, string> = {
  'start-end': 'Start + end',
  'start-only': 'Start only',
  'end-only': 'End only',
  custom: 'Interval',
};

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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="timer-settings-panel" data-testid="dashboard-timer-settings-panel" id="dashboard-timer-settings">
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

      <label className="field-card">
        <span className="field-label">Cue bell</span>
        <select
          className="field-select"
          value={settings.cueMode}
          onChange={(event) => {
            update({ cueMode: event.target.value as TimerCueMode });
          }}
        >
          {TIMER_CUE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {CUE_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>

      {settings.cueMode === 'custom' ? (
        <label className="field-card">
          <span className="field-label">Ring every (seconds)</span>
          <input
            className="field-input"
            type="number"
            min={1}
            max={3600}
            value={settings.intervalSeconds}
            onChange={(event) => {
              update({ intervalSeconds: Math.max(1, Number(event.target.value)) });
            }}
          />
        </label>
      ) : null}

      <label className="field-card">
        <span className="field-label">Sound</span>
        <select
          className="field-select"
          value={settings.soundProfileId}
          onChange={(event) => {
            update({ soundProfileId: event.target.value as TimerSettings['soundProfileId'] });
          }}
        >
          {SOUND_PROFILES.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
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
