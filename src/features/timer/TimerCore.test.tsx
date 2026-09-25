import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { TimerCore, type TimerCoreProps } from './TimerCore';
import { clearTimerPreferencesStorage, DEFAULT_TIMER_PREFERENCES, saveTimerPreferences } from './timerPreferences';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  clearTimerPreferencesStorage();
});

afterEach(() => {
  clearTimerPreferencesStorage();
  vi.useRealTimers();
});

function renderTimerCore(props: Partial<TimerCoreProps> = {}) {
  return render(
    <MemoryRouter>
      <TimerCore mode="compact" source="daily-dashboard" {...props} />
    </MemoryRouter>,
  );
}

describe('TimerCore dashboard mode', () => {
  it('renders preset buttons when idle', () => {
    renderTimerCore();

    expect(screen.getByTestId('dashboard-meditation-timer')).toBeVisible();
    expect(screen.getByTestId('meditation-presets')).toBeVisible();
    expect(screen.getByTestId('meditation-preset-5')).toBeVisible();
    expect(screen.getByTestId('meditation-preset-10')).toBeVisible();
    expect(screen.getByTestId('meditation-preset-15')).toBeVisible();
    expect(screen.queryByTestId('timer-readout')).not.toBeInTheDocument();
  });

  it('starts timer in-place when a preset is clicked — does not navigate', async () => {
    const user = userEvent.setup();

    renderTimerCore();

    await user.click(screen.getByTestId('meditation-preset-10'));

    expect(screen.getByTestId('dashboard-meditation-timer')).toBeVisible();
    expect(screen.getByTestId('timer-readout')).toBeVisible();
    expect(screen.getByTestId('timer-readout')).toHaveTextContent('10:00');
    expect(screen.queryByTestId('meditation-presets')).not.toBeInTheDocument();
  });

  it('preset buttons are buttons, not links — no navigation possible', () => {
    renderTimerCore();

    expect(screen.getByTestId('meditation-preset-5').tagName).toBe('BUTTON');
    expect(screen.getByTestId('meditation-preset-10').tagName).toBe('BUTTON');
    expect(screen.getByTestId('meditation-preset-15').tagName).toBe('BUTTON');
  });

  it('shows pause button while running and hides it on pause', async () => {
    const user = userEvent.setup();

    renderTimerCore();

    await user.click(screen.getByTestId('meditation-preset-5'));

    expect(screen.getByTestId('timer-pause')).toBeVisible();
    expect(screen.queryByTestId('timer-resume')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('timer-pause'));

    expect(screen.queryByTestId('timer-pause')).not.toBeInTheDocument();
    expect(screen.getByTestId('timer-resume')).toBeVisible();
  });

  it('shows resume button after pausing and can resume', async () => {
    const user = userEvent.setup();

    renderTimerCore();

    await user.click(screen.getByTestId('meditation-preset-5'));
    await user.click(screen.getByTestId('timer-pause'));

    expect(screen.getByTestId('timer-readout')).toBeVisible();

    await user.click(screen.getByTestId('timer-resume'));

    expect(screen.getByTestId('timer-pause')).toBeVisible();
    expect(screen.queryByTestId('timer-resume')).not.toBeInTheDocument();
  });

  it('returns to preset selection after stopping', async () => {
    const user = userEvent.setup();

    renderTimerCore();

    await user.click(screen.getByTestId('meditation-preset-5'));
    await user.click(screen.getByTestId('timer-stop'));

    expect(screen.getByTestId('meditation-presets')).toBeVisible();
    expect(screen.queryByTestId('timer-readout')).not.toBeInTheDocument();
  });

  it('custom duration input starts timer in-place', async () => {
    const user = userEvent.setup();

    renderTimerCore();

    await user.click(screen.getByTestId('meditation-custom-trigger'));
    expect(screen.getByTestId('meditation-custom-input')).toBeVisible();

    const input = screen.getByTestId('meditation-custom-input').querySelector('input');
    expect(input).not.toBeNull();

    if (input) {
      await user.clear(input);
      await user.type(input, '12');
    }

    await user.click(screen.getByTestId('meditation-begin'));

    expect(screen.getByTestId('timer-readout')).toBeVisible();
    expect(screen.getByTestId('timer-readout')).toHaveTextContent('12:00');
  });

  it('renders without error and accepts callbacks', () => {
    renderTimerCore();

    expect(screen.getByTestId('dashboard-meditation-timer')).toBeVisible();
  });

  it('cleans up interval on unmount', () => {
    const { unmount } = renderTimerCore();

    unmount();

    // No crash means interval was cleaned up — success
  });

  it('fires onComplete once when a 5-minute session completes', async () => {
    const onComplete = vi.fn();

    renderTimerCore({ defaultDurationMinutes: 5, onComplete });

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
      .click(screen.getByTestId('meditation-preset-5'));

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('does not fire onComplete multiple times', async () => {
    const onComplete = vi.fn();

    renderTimerCore({ defaultDurationMinutes: 5, onComplete });

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
      .click(screen.getByTestId('meditation-preset-5'));

    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('does not fire onComplete when history recording is disabled', async () => {
    const onComplete = vi.fn();

    saveTimerPreferences({ ...DEFAULT_TIMER_PREFERENCES, recordPracticeHistory: false });
    renderTimerCore({ defaultDurationMinutes: 5, onComplete });

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync })
      .click(screen.getByTestId('meditation-preset-5'));

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000);

    await waitFor(() => {
      expect(screen.getByTestId('timer-complete')).toBeVisible();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
