import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import {
  clearTimerPreferencesStorage,
  loadTimerPreferences,
  saveTimerPreferences,
} from '@/features/timer/timerPreferences';
import { clearTimerSessionStorage } from '@/features/timer/timerSessionStorage';

describe('audio-rights settings', () => {
  beforeEach(() => {
    clearTimerPreferencesStorage();
    clearTimerSessionStorage();
  });

  afterEach(() => {
    clearTimerPreferencesStorage();
    clearTimerSessionStorage();
  });

  it('surfaces bundled audio provenance and persists timer default preferences', async () => {
    const user = userEvent.setup();

    const aboutView = render(<AppTestRouter initialEntries={['/settings/about-legal']} />);

    expect(screen.getByTestId('audio-rights-default-gong')).toHaveTextContent('CC0-1.0');
    expect(screen.getByTestId('audio-rights-default-gong')).toHaveTextContent('Recorded');
    expect(screen.getByTestId('audio-rights-default-gong')).toHaveTextContent('Approved');
    expect(screen.getByTestId('audio-rights-default-gong')).toHaveTextContent('/audio/default-gong-start.mp3');

    aboutView.unmount();

    render(<AppTestRouter initialEntries={['/settings/timer-defaults']} />);

    await user.selectOptions(screen.getByTestId('setting-timer-cue-mode'), 'custom');
    fireEvent.change(screen.getByTestId('setting-timer-duration-seconds'), { target: { value: '600' } });
    fireEvent.change(screen.getByTestId('setting-timer-interval-seconds'), { target: { value: '60' } });
    await user.selectOptions(screen.getByTestId('setting-timer-sound-profile'), 'silent');
    await user.click(screen.getByTestId('setting-timer-record-history'));

    expect(loadTimerPreferences()).toEqual({
      defaultDurationSeconds: 600,
      defaultCueMode: 'custom',
      defaultIntervalSeconds: 60,
      defaultSoundProfileId: 'silent',
      recordPracticeHistory: false,
    });
  });

  it('applies the saved default sound profile on the timer route', async () => {
    const user = userEvent.setup();

    saveTimerPreferences({
      defaultDurationSeconds: 600,
      defaultCueMode: 'custom',
      defaultIntervalSeconds: 60,
      defaultSoundProfileId: 'silent',
      recordPracticeHistory: false,
    });

    render(<AppTestRouter initialEntries={['/timer']} />);

    await user.click(screen.getByTestId('timer-settings-toggle'));

    expect(screen.getByTestId('timer-duration-seconds')).toHaveValue(600);
    expect(screen.getByTestId('timer-cue-mode')).toHaveValue('custom');
    expect(screen.getByTestId('timer-interval-seconds')).toHaveValue(60);
    expect(screen.getByTestId('timer-sound-profile')).toHaveValue('silent');
    expect(screen.getByTestId('timer-record-history')).not.toBeChecked();
  });
});
