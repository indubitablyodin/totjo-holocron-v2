import { TimerCore } from '@/features/timer/TimerCore';
import { recordMeditationPractice } from '@/features/timer/timerHistory';

type DashboardTimerProps = {
  defaultDurationMinutes?: number;
};

export function DashboardTimer({ defaultDurationMinutes = 15 }: DashboardTimerProps) {
  return (
    <TimerCore
      mode="compact"
      defaultDurationMinutes={defaultDurationMinutes}
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
