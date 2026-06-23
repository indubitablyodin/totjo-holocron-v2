import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { clearTimerPreferencesStorage, loadTimerPreferences, saveTimerPreferences } from '@/features/timer/timerPreferences';
import { clearTimerSessionStorage } from '@/features/timer/timerSessionStorage';

function resetTimerState() {
  clearTimerPreferencesStorage();
  clearTimerSessionStorage();
}

describe('dashboard timer settings', () => {
  beforeEach(() => {
    resetTimerState();
  });

  it('shows timer settings gear on the dashboard', async () => {
    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-timer-settings-toggle')).toBeVisible();
    });
  });

  it('opens timer settings panel when gear is clicked', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-timer-settings-toggle')).toBeVisible();
    });

    expect(screen.queryByTestId('dashboard-timer-settings-panel')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('dashboard-timer-settings-toggle'));
    expect(screen.getByTestId('dashboard-timer-settings-panel')).toBeVisible();

    await user.click(screen.getByTestId('dashboard-timer-settings-toggle'));
    expect(screen.queryByTestId('dashboard-timer-settings-panel')).not.toBeInTheDocument();
  });

  it('changing default duration in settings panel updates storage', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-timer-settings-toggle')).toBeVisible();
    });

    await user.click(screen.getByTestId('dashboard-timer-settings-toggle'));

    const select = screen.getByLabelText('Default duration');
    await user.selectOptions(select, '30');

    const saved = loadTimerPreferences();
    expect(saved.defaultDurationSeconds).toBe(1800);
  });

  it('dashboard timer shows meditation presets in idle state', async () => {
    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('meditation-presets')).toBeVisible();
    });
  });

  it('dashboard timer starts in-place and records completion', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('meditation-presets')).toBeVisible();
    });

    await user.click(screen.getByTestId('meditation-preset-5'));

    expect(screen.getByTestId('dashboard-meditation-timer')).toBeVisible();
    expect(screen.getByTestId('timer-readout')).toBeVisible();
    expect(screen.queryByTestId('timer-page')).not.toBeInTheDocument();
  });

  it('settings panel has link to full timer defaults page', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-timer-settings-toggle')).toBeVisible();
    });

    await user.click(screen.getByTestId('dashboard-timer-settings-toggle'));
    expect(screen.getByRole('link', { name: /more timer settings/i })).toBeVisible();
  });

  it('changes default duration live via settings panel, persists to storage', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('meditation-presets')).toBeVisible();
    });

    await user.click(screen.getByTestId('dashboard-timer-settings-toggle'));
    await user.selectOptions(screen.getByLabelText('Default duration'), '20');

    const prefs = loadTimerPreferences();
    expect(prefs.defaultDurationSeconds).toBe(1200);
  });

  it('saved default duration is reflected in dashboard timer', async () => {
    saveTimerPreferences({
      defaultDurationSeconds: 600,
      defaultCueMode: 'start-end',
      defaultIntervalSeconds: 0,
      defaultSoundProfileId: 'default-gong',
      recordPracticeHistory: true,
    });

    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('meditation-presets')).toBeVisible();
    });

    await user.click(screen.getByTestId('meditation-preset-10'));
    expect(screen.getByTestId('timer-readout')).toHaveTextContent('10:00');
  });
});
