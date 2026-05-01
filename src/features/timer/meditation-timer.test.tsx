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
} from './timerModel';
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
