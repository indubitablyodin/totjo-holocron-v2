import { loadTimerPreferences } from '@/features/timer/timerPreferences';
import { loadTimerSession } from '@/features/timer/timerSessionStorage';
import type { TimerSessionState } from '@/features/timer/timerModel';
import type { TimerSettings } from '@/features/timer/timerSettingsStorage';

export type ResolvedTimerInit = {
  initialDurationSeconds?: number;
  initialSession?: Partial<TimerSessionState>;
};

/**
 * Resolve initial timer session with clear precedence:
 * 1. URL duration wins when explicitly present.
 * 2. Active running/paused saved session resumes.
 * 3. Idle/complete saved session does not override durable settings.
 * 4. Durable timer settings provide default idle duration.
 * 5. Hardcoded fallback applies only if settings are missing/corrupt.
 */
export function resolveInitialTimerSession(
  settings: TimerSettings,
  urlDurationMinutes: number | null,
): ResolvedTimerInit {
  const savedSession = loadTimerSession();
  const isActive = savedSession.phase === 'running' || savedSession.phase === 'paused';

  if (urlDurationMinutes && urlDurationMinutes > 0) {
    return {
      initialDurationSeconds: urlDurationMinutes * 60,
      initialSession: { cueMode: settings.cueMode, intervalSeconds: settings.intervalSeconds, soundProfileId: settings.soundProfileId, recordPracticeHistory: settings.recordPracticeHistory },
    };
  }

  if (isActive) {
    return { initialSession: savedSession };
  }

  return {
    initialDurationSeconds: settings.defaultDurationMinutes * 60,
    initialSession: { cueMode: settings.cueMode, intervalSeconds: settings.intervalSeconds, soundProfileId: settings.soundProfileId, recordPracticeHistory: settings.recordPracticeHistory },
  };
}
