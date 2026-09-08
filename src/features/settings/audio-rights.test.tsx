import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import type { AudioFileRecord } from '@/lib/content';
import { appDb, ensureStorageReady } from '@/lib/db';
import {
  clearTimerPreferencesStorage,
  loadTimerPreferences,
  saveTimerPreferences,
} from '@/features/timer/timerPreferences';
import { clearTimerSessionStorage } from '@/features/timer/timerSessionStorage';

const GUIDED_AUDIO: AudioFileRecord = {
  id: 'audio-file:guided-breathwork',
  name: 'Guided Breathwork',
  originalName: 'Guided Breathwork.mp3',
  mimeType: 'audio/mpeg',
  blob: new Blob(['sample-audio'], { type: 'audio/mpeg' }),
  durationSeconds: 420,
  sizeBytes: 12,
  createdAt: '2026-01-03T00:00:00.000Z',
};

describe('audio-rights settings', () => {
  beforeEach(async () => {
    clearTimerPreferencesStorage();
    clearTimerSessionStorage();
    await ensureStorageReady(appDb);
  });

  afterEach(async () => {
    await appDb.audioFiles.clear();
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
      defaultGuidedAudioFileId: null,
      guidedCueOverlay: true,
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
      defaultGuidedAudioFileId: null,
      guidedCueOverlay: true,
    });

    render(<AppTestRouter initialEntries={['/timer']} />);

    await user.click(screen.getByTestId('timer-remaining'));
    expect(screen.getByTestId('timer-duration-seconds')).toHaveValue('600');

    await user.click(screen.getByTestId('timer-advanced-toggle'));
    expect(screen.getByTestId('timer-cue-mode')).toHaveValue('custom');
    expect(screen.getByTestId('timer-interval-seconds')).toHaveValue(60);
    expect(screen.getByTestId('timer-sound-profile')).toHaveValue('silent');
    expect(screen.getByTestId('timer-record-history')).not.toBeChecked();
  });

  it('persists a guided audio file through the unified default timer sound selector', async () => {
    const user = userEvent.setup();

    await appDb.audioFiles.put(GUIDED_AUDIO);

    render(<AppTestRouter initialEntries={['/settings/timer-defaults']} />);

    const soundSelect = screen.getByTestId('setting-timer-sound-profile');

    expect(await screen.findByRole('option', { name: 'Guided Breathwork' })).toBeVisible();

    await user.selectOptions(soundSelect, `guided:${GUIDED_AUDIO.id}`);

    expect(loadTimerPreferences()).toMatchObject({
      defaultGuidedAudioFileId: GUIDED_AUDIO.id,
    });
    expect(screen.getByTestId('setting-timer-sound-profile')).toHaveValue(`guided:${GUIDED_AUDIO.id}`);
    expect(screen.getByTestId('setting-timer-guided-cue-overlay')).toBeChecked();

    await user.selectOptions(screen.getByTestId('setting-timer-sound-profile'), 'default-gong');

    expect(loadTimerPreferences()).toMatchObject({
      defaultSoundProfileId: 'default-gong',
      defaultGuidedAudioFileId: null,
    });
    expect(screen.getByTestId('setting-timer-sound-profile')).toHaveValue('default-gong');
  });
});
