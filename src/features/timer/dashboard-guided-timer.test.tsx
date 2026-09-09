const { GUIDED_AUDIO, mockListAudioFiles } = vi.hoisted(() => {
  const GUIDED_AUDIO = {
    id: 'audio-file:dashboard-breathwork',
    name: 'Dashboard Breathwork',
    originalName: 'Dashboard Breathwork.mp3',
    mimeType: 'audio/mpeg',
    blob: new Blob(['sample-audio'], { type: 'audio/mpeg' }),
    durationSeconds: 180,
    sizeBytes: 12,
    createdAt: '2026-01-03T00:00:00.000Z',
  };

  return {
    GUIDED_AUDIO,
    mockListAudioFiles: { current: async () => [GUIDED_AUDIO] },
  };
});

vi.mock('@/features/timer/audioFileManager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/timer/audioFileManager')>();

  return {
    ...actual,
    listAudioFiles: () => mockListAudioFiles.current(),
  };
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTestRouter } from '@/App';
import { appDb, ensureStorageReady } from '@/lib/db';
import { clearTimerPreferencesStorage, saveTimerPreferences, type TimerPreferences } from '@/features/timer/timerPreferences';
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

describe('dashboard guided meditation', () => {
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

  it('shows a Timed/Guided toggle on the dashboard card', async () => {
    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-timer-mode-toggle')).toBeVisible();
    });

    expect(screen.getByTestId('dashboard-timer-mode-timed')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dashboard-timer-mode-guided')).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets you pick a guided file from the dashboard and start a guided session', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-timer-mode-guided')).toBeVisible();
    });

    await user.click(screen.getByTestId('dashboard-timer-mode-guided'));

    expect(await screen.findByRole('option', { name: 'Dashboard Breathwork' })).toBeVisible();
    expect(screen.getByTestId('dashboard-timer-start-guided')).toBeDisabled();

    await user.selectOptions(screen.getByTestId('dashboard-guided-audio-select'), GUIDED_AUDIO.id);

    expect(screen.getByTestId('dashboard-timer-start-guided')).not.toBeDisabled();

    await user.click(screen.getByTestId('dashboard-timer-start-guided'));

    expect(screen.getByTestId('timer-readout')).toBeVisible();
  });

  it('loads guided mode by default and completes on the audio file ending, recording the guided name', async () => {
    saveTimerPreferences(GUIDED_PREFERENCES);

    render(<AppTestRouter initialEntries={['/daily']} />);

    expect(await screen.findByTestId('dashboard-timer-mode-guided')).toHaveAttribute('aria-pressed', 'true');
    await screen.findByRole('option', { name: 'Dashboard Breathwork' });

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-timer-start-guided')).not.toBeDisabled();
    });

    await fireEvent.click(screen.getByTestId('dashboard-timer-start-guided'));

    expect(screen.getByTestId('timer-readout')).toBeVisible();

    const guidedAudioElement = createdAudioElements.find((element) => element.src.startsWith('blob:'));
    expect(guidedAudioElement).toBeDefined();

    fireEvent(guidedAudioElement as HTMLAudioElement, new Event('ended'));

    await waitFor(() => {
      expect(screen.getByTestId('timer-complete')).toBeVisible();
    });

    const historyRecords = await appDb.practiceHistory.where('practiceKind').equals('meditation').toArray();

    expect(historyRecords).toHaveLength(1);
    expect(historyRecords[0]).toMatchObject({
      practiceKind: 'meditation',
      durationSeconds: 180,
      guidedAudioName: 'Dashboard Breathwork',
    });
  });

  it('exposes guided files as a default timer sound option in the dashboard gear panel', async () => {
    const user = userEvent.setup();

    render(<AppTestRouter initialEntries={['/daily']} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-timer-settings-toggle')).toBeVisible();
    });

    await user.click(screen.getByTestId('dashboard-timer-settings-toggle'));

    expect(await screen.findByRole('option', { name: 'Dashboard Breathwork' })).toBeVisible();

    await user.selectOptions(screen.getByTestId('dashboard-timer-sound-profile'), `guided:${GUIDED_AUDIO.id}`);

    const prefs = await import('@/features/timer/timerPreferences').then((mod) => mod.loadTimerPreferences());
    expect(prefs.defaultGuidedAudioFileId).toBe(GUIDED_AUDIO.id);

    // Default duration is inert once a guided default is set, so it drops out of the panel.
    expect(screen.queryByLabelText('Default duration')).not.toBeInTheDocument();
  });
});
