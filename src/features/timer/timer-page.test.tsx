import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import { saveTimerPreferences } from '@/features/timer/timerPreferences';
import { clearTimerSessionStorage } from '@/features/timer/timerSessionStorage';

describe('timer page layout', () => {
  beforeEach(() => {
    clearTimerSessionStorage();
  });

  it('keeps session setup hidden until requested and keeps one clear primary action', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/timer']} />);

    expect(screen.getByTestId('page-title')).toHaveTextContent('Timer');
    expect(screen.getByText('Start a session')).toBeVisible();
    expect(screen.queryByTestId('timer-defaults')).not.toBeInTheDocument();
    expect(screen.getByTestId('timer-meditation-presets')).toBeVisible();
    expect(screen.getByTestId('timer-start')).toHaveTextContent('Start timer');
    expect(screen.getByTestId('timer-reset')).toHaveTextContent('Reset session');
    expect(screen.getByTestId('timer-cancel')).toHaveTextContent('Cancel');

    const readout = screen.getByTestId('timer-remaining');
    const presets = screen.getByTestId('timer-meditation-presets');

    expect(readout.compareDocumentPosition(presets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByTestId('timer-settings-toggle'));

    expect(screen.getByText('Session setup')).toBeVisible();

    const panel = screen.getByTestId('timer-panel');
    const defaults = screen.getByTestId('timer-defaults');

    expect(panel.compareDocumentPosition(defaults) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('applies visible quick duration presets while the timer is idle', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/timer']} />);

    expect(screen.getByTestId('timer-meditation-preset-60')).toHaveTextContent('1 minute');
    expect(screen.getByTestId('timer-meditation-preset-300')).toHaveTextContent('5 minutes');
    expect(screen.getByTestId('timer-meditation-preset-1800')).toHaveTextContent('30 minutes');

    await user.click(screen.getByTestId('timer-meditation-preset-60'));

    expect(screen.getByTestId('timer-remaining')).toHaveTextContent('01:00');

    await user.click(screen.getByTestId('timer-meditation-preset-1800'));
    await user.click(screen.getByTestId('timer-settings-toggle'));

    expect(screen.getByTestId('timer-remaining')).toHaveTextContent('30:00');
    expect(screen.getByTestId('timer-duration-seconds')).toHaveValue(1800);
  });

  it('cancels back to Daily and clears the stored timer session', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/timer']} />);

    await user.click(screen.getByTestId('timer-meditation-preset-60'));
    expect(screen.getByTestId('timer-remaining')).toHaveTextContent('01:00');

    await user.click(screen.getByTestId('timer-cancel'));

    expect(await screen.findByText(/Today.?.s Practice/)).toBeVisible();

    await user.click(screen.getByTestId('bottom-nav-timer'));

    expect(await screen.findByTestId('timer-remaining')).toHaveTextContent('05:00');
  });

  it('switches the primary action to pause while the session is running', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/timer']} />);

    await user.click(screen.getByTestId('timer-start'));
    await user.click(screen.getByTestId('timer-settings-toggle'));

    expect(screen.queryByTestId('timer-start')).not.toBeInTheDocument();
    expect(screen.getByTestId('timer-pause')).toHaveTextContent('Pause timer');
    expect(screen.getByTestId('timer-duration-seconds')).toBeDisabled();
  });

  it('reset reloads the latest durable defaults from settings', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/timer']} />);

    await user.click(screen.getByTestId('timer-settings-toggle'));
    await user.type(screen.getByTestId('timer-duration-seconds'), '{selectall}{backspace}900');
    await user.selectOptions(screen.getByTestId('timer-cue-mode'), 'custom');
    await user.type(screen.getByTestId('timer-interval-seconds'), '{selectall}{backspace}90');

    saveTimerPreferences({
      defaultDurationSeconds: 600,
      defaultCueMode: 'custom',
      defaultIntervalSeconds: 60,
      defaultSoundProfileId: 'silent',
      recordPracticeHistory: false,
    });

    await user.click(screen.getByTestId('timer-reset'));

    expect(screen.getByTestId('timer-remaining')).toHaveTextContent('10:00');
    expect(screen.getByTestId('timer-cue-mode')).toHaveValue('custom');
    expect(screen.getByTestId('timer-duration-seconds')).toHaveValue(600);
    expect(screen.getByTestId('timer-interval-seconds')).toHaveValue(60);
    expect(screen.getByTestId('timer-sound-profile')).toHaveValue('silent');
    expect(screen.getByTestId('timer-record-history')).not.toBeChecked();
  });
});
