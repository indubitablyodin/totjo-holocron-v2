import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { AppTestRouter } from '@/App';
import type { AudioFileRecord } from '@/lib/content';
import { appDb, ensureStorageReady } from '@/lib/db';
import { saveTimerPreferences } from '@/features/timer/timerPreferences';
import { clearTimerPreferencesStorage } from '@/features/timer/timerPreferences';
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

describe('guided meditation timer', () => {
  beforeEach(async () => {
    clearTimerPreferencesStorage();
    clearTimerSessionStorage();
    await ensureStorageReady(appDb);
    await appDb.audioFiles.put(GUIDED_AUDIO);
  });

  afterEach(async () => {
    await appDb.audioFiles.clear();
    clearTimerPreferencesStorage();
    clearTimerSessionStorage();
  });

  it('opens guided mode from the toggle and navigates to the audio manager when no audio is chosen', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/timer']} />);

    expect(screen.getByTestId('timer-mode-guided')).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByTestId('timer-mode-guided'));

    expect(await screen.findByText('Upload an audio file')).toBeVisible();
  });

  it('loads guided mode by default when a default guided audio file is set', async () => {
    saveTimerPreferences({
      defaultDurationSeconds: 300,
      defaultCueMode: 'start-end',
      defaultIntervalSeconds: 0,
      defaultSoundProfileId: 'default-gong',
      recordPracticeHistory: true,
      defaultGuidedAudioFileId: GUIDED_AUDIO.id,
      guidedCueOverlay: true,
    });

    render(<AppTestRouter initialEntries={['/timer']} />);

    expect(screen.getByTestId('timer-mode-toggle')).toBeVisible();
    expect(screen.getByTestId('timer-mode-guided')).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('option', { name: 'Guided Breathwork' })).toBeVisible();
    expect(screen.getByTestId('timer-guided-audio-select')).toHaveValue(GUIDED_AUDIO.id);
    expect(screen.getByTestId('timer-guided-duration')).toHaveTextContent('Duration locked to Guided Breathwork (7:00)');
    expect(screen.getByTestId('timer-start')).toHaveTextContent('Start guided session');
    expect(screen.getByTestId('timer-guided-cue-overlay')).toBeChecked();

    await fireEvent.click(screen.getByTestId('timer-details-toggle'));
    expect(screen.getByTestId('timer-guided-audio-name')).toHaveTextContent('Guided Breathwork');
  });

  it('shows configured quick durations are disabled while guided audio is selected', async () => {
    saveTimerPreferences({
      defaultDurationSeconds: 300,
      defaultCueMode: 'start-end',
      defaultIntervalSeconds: 0,
      defaultSoundProfileId: 'default-gong',
      recordPracticeHistory: true,
      defaultGuidedAudioFileId: GUIDED_AUDIO.id,
      guidedCueOverlay: true,
    });

    render(<AppTestRouter initialEntries={['/timer']} />);

    expect(screen.getByTestId('timer-remaining')).toBeDisabled();
    expect(screen.getByTestId('timer-meditation-preset-60')).toBeDisabled();
  });

  it('switches back to timed mode and clears the guided selection', async () => {
    const user = userEvent.setup();

    saveTimerPreferences({
      defaultDurationSeconds: 300,
      defaultCueMode: 'start-end',
      defaultIntervalSeconds: 0,
      defaultSoundProfileId: 'default-gong',
      recordPracticeHistory: true,
      defaultGuidedAudioFileId: GUIDED_AUDIO.id,
      guidedCueOverlay: true,
    });

    render(<AppTestRouter initialEntries={['/timer']} />);

    await user.click(screen.getByTestId('timer-mode-timed'));

    expect(screen.getByTestId('timer-mode-timed')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('timer-guided-audio-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('timer-start')).toHaveTextContent('Start timer');
  });
});