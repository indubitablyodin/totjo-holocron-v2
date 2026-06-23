import { useMemo } from 'react';

import { TimerCore } from '@/features/timer/TimerCore';
import { recordMeditationPractice } from '@/features/timer/timerHistory';
import { loadTimerSettings } from '@/features/timer/timerSettingsStorage';

type DashboardTimerProps = {
  defaultDurationMinutes?: number;
};

export function DashboardTimer({ defaultDurationMinutes }: DashboardTimerProps) {
  const settings = useMemo(() => loadTimerSettings(), []);
  const duration = defaultDurationMinutes ?? settings.defaultDurationMinutes;

  return (
    <TimerCore
      mode="compact"
      defaultDurationMinutes={duration}
      source="daily-dashboard"
      onComplete={async (event) => {
        await recordMeditationPractice({
          completedAt: event.completedAt,
          durationSeconds: event.durationSeconds,
        });
      }}
    />
  );
}
