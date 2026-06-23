import {
  loadTimerPreferences,
  saveTimerPreferences,
  clearTimerPreferencesStorage,
  type TimerCueMode,
  type TimerPreferences,
} from '@/features/timer/timerPreferences';
import { DEFAULT_SOUND_PROFILE_ID } from '@/features/timer/audioProfiles';
import type { SoundProfileId } from '@/features/timer/audioProfiles';

export type TimerSettings = {
  defaultDurationMinutes: number;
  cueMode: TimerCueMode;
  intervalSeconds: number;
  soundProfileId: SoundProfileId;
  recordPracticeHistory: boolean;
};

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  defaultDurationMinutes: 5,
  cueMode: 'end-only',
  intervalSeconds: 0,
  soundProfileId: DEFAULT_SOUND_PROFILE_ID,
  recordPracticeHistory: true,
};

function preferencesToSettings(prefs: TimerPreferences): TimerSettings {
  return {
    defaultDurationMinutes: Math.round(prefs.defaultDurationSeconds / 60),
    cueMode: prefs.defaultCueMode,
    intervalSeconds: prefs.defaultIntervalSeconds,
    soundProfileId: prefs.defaultSoundProfileId,
    recordPracticeHistory: prefs.recordPracticeHistory,
  };
}

function settingsToPreferences(settings: TimerSettings): TimerPreferences {
  return {
    defaultDurationSeconds: settings.defaultDurationMinutes * 60,
    defaultCueMode: settings.cueMode,
    defaultIntervalSeconds: settings.intervalSeconds,
    defaultSoundProfileId: settings.soundProfileId,
    recordPracticeHistory: settings.recordPracticeHistory,
  };
}

export function loadTimerSettings(): TimerSettings {
  return preferencesToSettings(loadTimerPreferences());
}

export function saveTimerSettings(settings: TimerSettings): void {
  saveTimerPreferences(settingsToPreferences(settings));
}

export function resetTimerSettings(): TimerSettings {
  clearTimerPreferencesStorage();
  return DEFAULT_TIMER_SETTINGS;
}
