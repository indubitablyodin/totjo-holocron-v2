import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SOUND_PROFILES } from '@/features/timer/audioProfiles';
import { listAudioFiles } from '@/features/timer/audioFileManager';
import { loadTimerSettings, saveTimerSettings, type TimerSettings } from '@/features/timer/timerSettingsStorage';
import type { AudioFileRecord } from '@/lib/content';

type TimerSettingsPanelProps = {
  isOpen: boolean;
  onSettingsChange?: (settings: TimerSettings) => void;
};

export function TimerSettingsPanel({ isOpen, onSettingsChange }: TimerSettingsPanelProps) {
  const [settings, setSettings] = useState<TimerSettings>(loadTimerSettings);
  const [audioFiles, setAudioFiles] = useState<AudioFileRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    void listAudioFiles().then((files) => {
      if (isMounted) {
        setAudioFiles(files);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
        <span className="field-label">Default timer sound</span>
        <select
          className="field-select"
          data-testid="dashboard-timer-sound-profile"
          onChange={(event) => {
            const nextValue = event.target.value;

            if (nextValue.startsWith('guided:')) {
              update({ defaultGuidedAudioFileId: nextValue.slice('guided:'.length) });
              return;
            }

            update({ soundProfileId: nextValue as TimerSettings['soundProfileId'], defaultGuidedAudioFileId: null });
          }}
          value={settings.defaultGuidedAudioFileId ? `guided:${settings.defaultGuidedAudioFileId}` : settings.soundProfileId}
        >
          {SOUND_PROFILES.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
            </option>
          ))}
          {audioFiles.length > 0 ? (
            <optgroup label="Guided meditation audio">
              {audioFiles.map((file) => (
                <option key={file.id} value={`guided:${file.id}`}>
                  {file.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>

      {!settings.defaultGuidedAudioFileId ? (
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
      ) : null}

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
