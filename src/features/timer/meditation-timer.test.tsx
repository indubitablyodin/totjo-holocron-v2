import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';

import { createAppDatabase, type HolocronDatabase } from '@/lib/db';

import {
  applyEditableTimerConfig,
  advanceTimerSession,
  createDefaultTimerSession,
  hydrateStoredTimerSession,
  pauseTimerSession,
  resetTimerSession,
  resumeTimerSession,
  startTimerSession,
  completeTimerSession,
} from './timerModel';
import type { TimerSessionState } from './timerModel';
import { DEFAULT_TIMER_PREFERENCES } from './timerPreferences';
import { listMeditationPracticeHistory, recordMeditationPractice } from './timerHistory';

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Failed to delete database ${name}`));
    request.onblocked = () => reject(new Error(`Delete blocked for database ${name}`));
  });
}

async function closeAndDeleteDatabase(database: HolocronDatabase): Promise<void> {
  const { name } = database;

  if (database.isOpen()) {
    database.close();
  }

  await deleteDatabase(name);
}

afterEach(async () => {
  await deleteDatabase('meditation-timer-history-test');
});

describe('meditation-timer model', () => {
  it('supports start, pause, resume, reset, and persisted timestamp hydration', () => {
    const configured = applyEditableTimerConfig(createDefaultTimerSession(), {
      totalDurationSeconds: '10',
      cueMode: 'custom',
      intervalSeconds: '2',
      soundProfileId: 'default-gong',
      recordPracticeHistory: true,
    });

    const started = startTimerSession(configured, 1_000);
    const afterFourSeconds = advanceTimerSession(started, 5_000);
    const paused = pauseTimerSession(afterFourSeconds.session, 5_000);
    const resumed = resumeTimerSession(paused, 7_000);
    const restored = hydrateStoredTimerSession(resumed, {
      defaultDurationSeconds: 300,
      defaultCueMode: 'end-only',
      defaultIntervalSeconds: 0,
      defaultSoundProfileId: 'default-gong',
      recordPracticeHistory: true,
      defaultGuidedAudioFileId: null,
      guidedCueOverlay: true,
    }, 10_000);
    const completed = advanceTimerSession(restored, 13_000);
    const reset = resetTimerSession(completed.session);

    expect(configured.remainingSeconds).toBe(10);
    expect(started.phase).toBe('running');
    expect(afterFourSeconds.session.remainingSeconds).toBe(6);
    expect(afterFourSeconds.cueKind).toBe('interval');
    expect(paused.phase).toBe('paused');
    expect(paused.remainingSeconds).toBe(6);
    expect(resumed.phase).toBe('running');
    expect(restored.remainingSeconds).toBe(3);
    expect(completed.session.phase).toBe('complete');
    expect(completed.cueKind).toBe('complete');
    expect(completed.didComplete).toBe(true);
    expect(reset.phase).toBe('idle');
    expect(reset.remainingSeconds).toBe(10);
  });

  it('defaults new sessions to guided when a guided default file is set', () => {
    const guided = createDefaultTimerSession({
      ...DEFAULT_TIMER_PREFERENCES,
      defaultGuidedAudioFileId: 'audio-file:guided-breathwork',
    });
    const timed = createDefaultTimerSession();

    expect(guided.kind).toBe('guided');
    expect(timed.kind).toBe('timed');
  });

  it('guided sessions never emit interval cues', () => {
    const configured = applyEditableTimerConfig(createDefaultTimerSession(), {
      kind: 'guided',
      guidedAudioFileId: 'audio-file:guided-breathwork',
      totalDurationSeconds: 420,
      cueMode: 'custom',
      intervalSeconds: 10,
      soundProfileId: 'default-gong',
      recordPracticeHistory: true,
      guidedCueOverlay: true,
    });
    const started = startTimerSession(configured, 1_000);
    const afterFifteenSeconds = advanceTimerSession(started, 16_000);

    expect(configured.kind).toBe('guided');
    expect(afterFifteenSeconds.session.kind).toBe('guided');
    expect(afterFifteenSeconds.session.lastIntervalIndex).toBe(0);
    expect(afterFifteenSeconds.cueKind).toBeNull();
  });

  it('switching the session kind to timed clears the guided audio file', () => {
    const guided = applyEditableTimerConfig(createDefaultTimerSession(), {
      kind: 'guided',
      guidedAudioFileId: 'audio-file:guided-breathwork',
    });
    const timed = applyEditableTimerConfig(guided, { kind: 'timed' });

    expect(guided.kind).toBe('guided');
    expect(guided.guidedAudioFileId).toBe('audio-file:guided-breathwork');
    expect(timed.kind).toBe('timed');
    expect(timed.guidedAudioFileId).toBeNull();
  });

  it('hydrates persisted guided sessions and falls back to timed when no file exists', () => {
    const preferences = { ...DEFAULT_TIMER_PREFERENCES, defaultGuidedAudioFileId: null };
    const storedGuided: Partial<TimerSessionState> = {
      kind: 'guided',
      guidedAudioFileId: 'audio-file:guided-breathwork',
      phase: 'running',
      totalDurationSeconds: 420,
      remainingSeconds: 300,
      soundProfileId: 'default-gong',
      recordPracticeHistory: true,
      guidedCueOverlay: true,
    };
    const restoredGuided = hydrateStoredTimerSession(storedGuided, preferences, 0);
    const restoredWithoutFile = hydrateStoredTimerSession(
      { ...storedGuided, guidedAudioFileId: null },
      preferences,
      0,
    );
    const restoredInvalidKind = hydrateStoredTimerSession(
      { ...storedGuided, kind: 'not-a-kind' },
      preferences,
      0,
    );

    expect(restoredGuided.kind).toBe('guided');
    expect(restoredGuided.guidedAudioFileId).toBe('audio-file:guided-breathwork');
    expect(restoredGuided.remainingSeconds).toBe(300);
    expect(restoredWithoutFile.kind).toBe('timed');
    expect(restoredInvalidKind.kind).toBe('timed');
    expect(restoredInvalidKind.guidedAudioFileId).toBe('audio-file:guided-breathwork');
  });

  it('completes a guided session immediately when the audio ends', () => {
    const running = startTimerSession(
      applyEditableTimerConfig(createDefaultTimerSession(), {
        kind: 'guided',
        guidedAudioFileId: 'audio-file:guided-breathwork',
        totalDurationSeconds: 420,
        cueMode: 'start-end',
        intervalSeconds: 0,
        soundProfileId: 'default-gong',
        recordPracticeHistory: true,
        guidedCueOverlay: true,
      }),
      10_000,
    );
    const completed = completeTimerSession(running, 42_000);

    expect(completed.kind).toBe('guided');
    expect(completed.phase).toBe('complete');
    expect(completed.remainingSeconds).toBe(0);
    expect(completed.targetEndAtMs).toBeNull();
    expect(completed.completedAtMs).toBe(42_000);
  });

  it('records optional local meditation practice history entries', async () => {
    const database = createAppDatabase('meditation-timer-history-test');

    try {
      await recordMeditationPractice(
        {
          completedAt: '2026-04-27T12:00:10.000Z',
          durationSeconds: 300,
        },
        database,
      );
      await recordMeditationPractice(
        {
          completedAt: '2026-04-27T12:05:10.000Z',
          durationSeconds: 600,
        },
        database,
      );

      const historyEntries = await listMeditationPracticeHistory(5, database);

      expect(historyEntries).toHaveLength(2);
      expect(historyEntries[0]).toMatchObject({
        practiceKind: 'meditation',
        durationSeconds: 600,
        completedAt: '2026-04-27T12:05:10.000Z',
      });
      expect(historyEntries[1]).toMatchObject({
        practiceKind: 'meditation',
        durationSeconds: 300,
      });
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });
});
