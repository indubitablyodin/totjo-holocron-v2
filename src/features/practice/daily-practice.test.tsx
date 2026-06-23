import { indexedDB } from 'fake-indexeddb';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TimerPage } from '@/features/timer/TimerPage';
import { clearTimerSessionStorage } from '@/features/timer/timerSessionStorage';
import { createAppDatabase, type HolocronDatabase } from '@/lib/db';

import { DailyPracticePage } from './DailyPracticePage';
import { clearDailyPracticeClockOverride } from './dailyPracticeClock';
import { dailyFocusPool, selectDailyFocus } from './dailyFocusEngine';
import { getMeditationPracticeStats } from './dailyPracticeStorage';
import { clearDailyQuickAccessMiddleSlot, saveDailyQuickAccessMiddleSlot } from './dailyQuickAccess';

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

function renderDailyPractice(options: { database: HolocronDatabase; now: Date; timeZone?: string }) {
  return render(
    <MemoryRouter initialEntries={['/daily']}>
      <Routes>
        <Route
          element={<DailyPracticePage database={options.database} now={options.now} timeZone={options.timeZone ?? 'America/Chicago'} />}
          path="/daily"
        />
        <Route element={<TimerPage />} path="/timer" />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  clearTimerSessionStorage();
  clearDailyPracticeClockOverride();
  clearDailyQuickAccessMiddleSlot();
});

afterEach(async () => {
  await deleteDatabase('daily-practice-test-db').catch(() => undefined);
});

describe('daily focus selection and front page', () => {
  it('builds the deterministic Daily Focus pool only from the requested structured doctrine sources', () => {
    expect(dailyFocusPool).toHaveLength(48);
    expect(dailyFocusPool.filter((entry) => entry.sourceSlug === 'jedi-believe')).toHaveLength(8);
    expect(dailyFocusPool.filter((entry) => entry.sourceSlug === 'three-tenets')).toHaveLength(3);
    expect(dailyFocusPool.filter((entry) => entry.sourceSlug === '16-teachings')).toHaveLength(16);
    expect(dailyFocusPool.filter((entry) => entry.sourceSlug === '21-maxims')).toHaveLength(21);
    expect(dailyFocusPool.map((entry) => entry.sourceSlug)).not.toContain('code');
    expect(dailyFocusPool.map((entry) => entry.sourceSlug)).not.toContain('a-meditation-for-jedi');
    expect(dailyFocusPool.map((entry) => entry.sourceSlug)).not.toContain('knights-code');
    expect(dailyFocusPool.some((entry) => entry.sourceHref.startsWith('/library/sermons'))).toBe(false);
    expect(dailyFocusPool[5]).toMatchObject({ label: 'Jedi Believe #6', sourceSlug: 'jedi-believe' });
    expect(dailyFocusPool.every((entry) => / #\d+$/.test(entry.label))).toBe(true);
  });

  it('selects by UTC day with Euclidean modulo and the same result for everyone', () => {
    const anchorSelection = selectDailyFocus(new Date('2026-04-26T00:00:00.000Z'));
    const nextSelection = selectDailyFocus(new Date('2026-04-27T00:00:00.000Z'));
    const previousSelection = selectDailyFocus(new Date('2026-04-25T23:59:59.000Z'));

    expect(anchorSelection.entryIndex).toBe(0);
    expect(nextSelection.entryIndex).toBe(1);
    expect(previousSelection.entryIndex).toBe(dailyFocusPool.length - 1);
    expect(selectDailyFocus(new Date('2026-04-27T04:55:00.000Z')).entryIndex).toBe(1);
    expect(selectDailyFocus(new Date('2026-04-27T05:05:00.000Z')).entryIndex).toBe(1);
  });

  it('shows the Jedi Believe preface when a belief line is selected', async () => {
    const database = createAppDatabase('daily-practice-test-db');

    try {
      renderDailyPractice({ database, now: new Date('2026-04-26T12:00:00.000Z') });

      await waitFor(() => {
        expect(screen.getByText(/Today.?.s Practice/)).toBeVisible();
      });

      expect(screen.getByText('Jediism is a religion based on the observance of the Force. We believe:')).toBeVisible();
      expect(screen.getByTestId('daily-focus-source')).toHaveTextContent('Jedi Believe #1');
      expect(screen.getByTestId('daily-focus-card')).not.toHaveTextContent('Daily Focus');
      expect(screen.getByTestId('daily-focus-source')).not.toHaveTextContent('from Jedi Believe');
      expect(screen.getByTestId('daily-open-source')).toHaveAttribute('href', '/library/doctrine/jedi-believe');
      expect(screen.queryByTestId('reader-controls-toggle')).not.toBeInTheDocument();
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('counts distinct meditation days and the current streak by local practice day', async () => {
    const database = createAppDatabase('daily-practice-test-db');

    try {
      await database.practiceHistory.bulkPut([
        {
          id: 'meditation:one',
          documentId: null,
          practiceKind: 'meditation',
          completedAt: '2026-04-28T14:00:00.000Z',
          durationSeconds: 60,
        },
        {
          id: 'meditation:two',
          documentId: null,
          practiceKind: 'meditation',
          completedAt: '2026-04-29T14:00:00.000Z',
          durationSeconds: 300,
        },
        {
          id: 'meditation:duplicate-day',
          documentId: null,
          practiceKind: 'meditation',
          completedAt: '2026-04-29T22:00:00.000Z',
          durationSeconds: 1800,
        },
        {
          id: 'meditation:ignored-zero',
          documentId: null,
          practiceKind: 'meditation',
          completedAt: '2026-04-30T14:00:00.000Z',
          durationSeconds: 0,
        },
      ]);

      await expect(getMeditationPracticeStats(new Date('2026-04-29T18:00:00.000Z'), 'America/Chicago', database)).resolves.toEqual({
        totalDistinctDays: 2,
        currentStreakDays: 2,
      });
      await expect(getMeditationPracticeStats(new Date('2026-04-30T18:00:00.000Z'), 'America/Chicago', database)).resolves.toEqual({
        totalDistinctDays: 2,
        currentStreakDays: 2,
      });
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('keeps meditation stats on Daily and opens Timer without Daily-owned duration controls', async () => {
    const database = createAppDatabase('daily-practice-test-db');
    const user = userEvent.setup();

    try {
      renderDailyPractice({ database, now: new Date('2026-04-26T12:00:00.000Z') });

      await waitFor(() => {
        expect(screen.getByTestId('meditation-presets')).toBeVisible();
      });

      expect(screen.getByText('Meditation')).toBeVisible();
      expect(screen.queryByText('Quick meditation')).not.toBeInTheDocument();
      expect(screen.getByTestId('meditation-total-days')).toHaveTextContent(/Loading|0 days/);
      expect(screen.queryByTestId('daily-meditation-presets')).not.toBeInTheDocument();
      expect(screen.queryByTestId('daily-meditation-preset-60')).not.toBeInTheDocument();
      expect(screen.queryByTestId('daily-meditation-preset-300')).not.toBeInTheDocument();
      expect(screen.queryByTestId('daily-meditation-preset-1800')).not.toBeInTheDocument();
      expect(screen.queryByTestId('daily-cancel-meditation')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('meditation-preset-15'));

      expect(await screen.findByTestId('dashboard-meditation-timer')).toBeVisible();
      expect(screen.getByTestId('timer-readout')).toBeVisible();
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('shows three simple quick access buttons with the default middle slot', async () => {
    const database = createAppDatabase('daily-practice-test-db');

    try {
      renderDailyPractice({ database, now: new Date('2026-04-26T12:00:00.000Z') });

      await waitFor(() => {
        expect(screen.getByTestId('daily-quick-access-jedi-code')).toBeVisible();
      });

      expect(screen.getByTestId('daily-quick-access-jedi-code')).toHaveAttribute('href', '/library/doctrine/code');
      expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/settings/focus-practice');
      expect(screen.getByTestId('daily-quick-access-bookmarks')).toHaveAttribute('href', '/library/bookmarks');
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('uses the selected reading for the configurable quick access middle slot', async () => {
    const database = createAppDatabase('daily-practice-test-db');

    try {
      saveDailyQuickAccessMiddleSlot('document:supplemental-knights-code');
      renderDailyPractice({ database, now: new Date('2026-04-26T12:00:00.000Z') });

      await waitFor(() => {
        expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveTextContent("Knight's Code");
      });
      expect(screen.getByTestId('daily-quick-access-middle-slot')).toHaveAttribute('href', '/library/supplemental/knights-code');
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });
});
