const { GUIDED_AUDIO, mockListAudioFiles } = vi.hoisted(() => {
  const GUIDED_AUDIO = {
    id: 'audio-file:guided-breathwork',
    name: 'Guided Breathwork',
    originalName: 'Guided Breathwork.mp3',
    mimeType: 'audio/mpeg',
    blob: new Blob(['sample-audio'], { type: 'audio/mpeg' }),
    durationSeconds: 420,
    sizeBytes: 12,
    createdAt: '2026-01-03T00:00:00.000Z',
  };

  return {
    GUIDED_AUDIO,
    mockListAudioFiles: { current: async () => [GUIDED_AUDIO] },
  };
});

vi.mock('@/features/timer/audioFileManager', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/timer/audioFileManager')>();

  return {
    ...actual,
    listAudioFiles: () => mockListAudioFiles.current(),
  };
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { AppTestRouter } from '@/App';
import { appDb, ensureStorageReady } from '@/lib/db';
import { saveTimerPreferences, type TimerPreferences } from '@/features/timer/timerPreferences';
import { clearTimerPreferencesStorage } from '@/features/timer/timerPreferences';
import { clearTimerSessionStorage } from '@/features/timer/timerSessionStorage';

const GUIDED_PREFERENCES: TimerPreferences = {
  defaultDurationSeconds: 300,
  defaultCueMode: 'start-end',
  defaultIntervalSeconds: 0,
  defaultSoundProfileId: 'default-gong',
  recordPracticeHistory: true,
  defaultGuidedAudioFileId: GUIDED_AUDIO.id,
  guidedCueOverlay: true,
};

describe('guided meditation timer', () => {
  let createdAudioElements: HTMLAudioElement[];

  beforeEach(async () => {
    clearTimerPreferencesStorage();
    clearTimerSessionStorage();
    await ensureStorageReady(appDb);
    await appDb.audioFiles.put(GUIDED_AUDIO);
    mockListAudioFiles.current = async () => [GUIDED_AUDIO];

    createdAudioElements = [];
    const RealAudio = window.Audio;
    vi.spyOn(window, 'Audio').mockImplementation(function MockAudio(this: unknown, src?: string) {
      const element = new RealAudio(src);
      createdAudioElements.push(element);
      return element;
    });
  });

  afterEach(async () => {
    await appDb.audioFiles.clear();
    await appDb.practiceHistory.clear();
    clearTimerPreferencesStorage();
    clearTimerSessionStorage();
    vi.restoreAllMocks();
  });

  it('opens guided mode from the toggle and lets you pick from existing audio when no default is chosen', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/timer']} />);

    expect(screen.getByTestId('timer-mode-guided')).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByTestId('timer-mode-guided'));

    expect(screen.getByTestId('timer-mode-guided')).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('option', { name: 'Guided Breathwork' })).toBeVisible();
    expect(screen.getByTestId('timer-guided-audio-select')).toHaveValue('');
    expect(screen.getByTestId('timer-start')).toBeDisabled();
  });

  it('sends you to the audio manager when no guided audio exists on the device at all', async () => {
    const user = userEvent.setup();

    mockListAudioFiles.current = async () => [];
    await appDb.audioFiles.clear();

    render(<AppTestRouter initialEntries={['/timer']} />);

    await user.click(screen.getByTestId('timer-mode-guided'));

    expect(await screen.findByText('Upload an audio file')).toBeVisible();
  });

  it('loads guided mode by default when a default guided audio file is set', async () => {
    saveTimerPreferences(GUIDED_PREFERENCES);

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

  it('reports the session kind in session details and switches it with the mode toggle', async () => {
    const user = userEvent.setup();

    saveTimerPreferences(GUIDED_PREFERENCES);

    render(<AppTestRouter initialEntries={['/timer']} />);

    await fireEvent.click(screen.getByTestId('timer-details-toggle'));
    expect(screen.getByTestId('timer-session-kind')).toHaveTextContent('Guided meditation');

    await user.click(screen.getByTestId('timer-mode-timed'));

    expect(screen.getByTestId('timer-mode-timed')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('timer-session-kind')).toHaveTextContent('Timed meditation');
  });

  it('completes the guided session when the audio file ends', async () => {
    saveTimerPreferences(GUIDED_PREFERENCES);

    render(<AppTestRouter initialEntries={['/timer']} />);

    await screen.findByRole('option', { name: 'Guided Breathwork' });

    await fireEvent.click(screen.getByTestId('timer-start'));

    expect(screen.getByTestId('timer-status')).toHaveTextContent('Running');

    const guidedAudioElement = createdAudioElements.find((element) => element.src.startsWith('blob:'));

    expect(guidedAudioElement).toBeDefined();

    fireEvent(guidedAudioElement as HTMLAudioElement, new Event('ended'));

    await waitFor(() => expect(screen.getByTestId('timer-status')).toHaveTextContent('Complete'));

    const historyRecords = await appDb.practiceHistory.where('practiceKind').equals('meditation').toArray();

    expect(historyRecords).toHaveLength(1);
    expect(historyRecords[0]).toMatchObject({
      practiceKind: 'meditation',
      durationSeconds: 420,
      guidedAudioName: 'Guided Breathwork',
    });
  });

  it('shows configured quick durations are disabled while guided audio is selected', async () => {
    saveTimerPreferences(GUIDED_PREFERENCES);

    render(<AppTestRouter initialEntries={['/timer']} />);

    expect(screen.getByTestId('timer-remaining')).toBeDisabled();
    expect(screen.getByTestId('timer-meditation-preset-60')).toBeDisabled();
  });

  it('switches back to timed mode and clears the guided selection', async () => {
    const user = userEvent.setup();

    saveTimerPreferences(GUIDED_PREFERENCES);

    render(<AppTestRouter initialEntries={['/timer']} />);

    await user.click(screen.getByTestId('timer-mode-timed'));

    expect(screen.getByTestId('timer-mode-timed')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('timer-guided-audio-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('timer-start')).toHaveTextContent('Start timer');
  });
});
