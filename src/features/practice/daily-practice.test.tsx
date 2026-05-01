import { indexedDB } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { createAppDatabase, type HolocronDatabase } from '@/lib/db';

import { DailyPracticePage } from './DailyPracticePage';
import { getDailyPracticeDayKey, selectDailyPractice, selectDailyPracticeFromLocalDateTime } from './dailyPracticeEngine';

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

function renderDailyPractice(options: { database: HolocronDatabase; now: Date; timeZone: string }) {
  return render(
    <MemoryRouter initialEntries={['/daily']}>
      <Routes>
        <Route element={<DailyPracticePage database={options.database} now={options.now} timeZone={options.timeZone} />} path="/daily" />
      </Routes>
    </MemoryRouter>,
  );
}

function renderDailyPracticeRoute(database: HolocronDatabase) {
  return render(
    <MemoryRouter initialEntries={['/daily']}>
      <Routes>
        <Route element={<DailyPracticePage database={database} />} path="/daily" />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(async () => {
  await deleteDatabase('daily-practice-test-db').catch(() => undefined);
});

describe('daily-practice selection and completion', () => {
  it('selects the next deterministic entry after local midnight in the active time zone', () => {
    const beforeMidnight = new Date('2026-04-26T23:55:00-05:00');
    const afterMidnight = new Date('2026-04-27T00:05:00-05:00');

    const beforeSelection = selectDailyPractice(beforeMidnight, 'America/Chicago');
    const afterSelection = selectDailyPractice(afterMidnight, 'America/Chicago');

    expect(getDailyPracticeDayKey(beforeMidnight, 'America/Chicago')).toBe('2026-04-26');
    expect(getDailyPracticeDayKey(afterMidnight, 'America/Chicago')).toBe('2026-04-27');
    expect(beforeSelection.title).not.toBe(afterSelection.title);
    expect(beforeSelection.practiceDayId).not.toBe(afterSelection.practiceDayId);
    expect(beforeSelection.entryIndex).toBe(0);
    expect(afterSelection.entryIndex).toBe(1);
  });

  it('keeps the same curated item completed after reload on the same day', async () => {
    const database = createAppDatabase('daily-practice-test-db');
    const user = userEvent.setup();
    const now = new Date('2026-04-26T09:00:00-05:00');

    try {
      const firstRender = renderDailyPractice({ database, now, timeZone: 'America/Chicago' });

      const firstTitle = await screen.findByTestId('daily-practice-title');
      const selectedTitle = firstTitle.textContent;

      await waitFor(() => {
        expect(screen.getByTestId('daily-status')).toHaveTextContent('Ready');
      });
      expect(screen.getByTestId('daily-open-source')).toHaveClass('primary-button');
      expect(screen.getByTestId('daily-completion-summary')).toHaveTextContent(
        'Mark today complete after you finish the selected reading.',
      );
      await user.click(screen.getByTestId('daily-complete'));
      await waitFor(() => {
        expect(screen.getByTestId('daily-status')).toHaveTextContent('Completed');
      });
      expect(screen.getByTestId('daily-completion-summary')).toHaveTextContent('Today is marked complete.');
      expect(screen.getByTestId('daily-open-source')).toHaveAttribute('href', '/library/doctrine/jedi-believe');

      firstRender.unmount();

      renderDailyPractice({ database, now, timeZone: 'America/Chicago' });

      expect(await screen.findByTestId('daily-practice-title')).toHaveTextContent(selectedTitle ?? '');
      await waitFor(() => {
        expect(screen.getByTestId('daily-status')).toHaveTextContent('Completed');
      });
      expect(screen.getByTestId('daily-complete')).toBeDisabled();
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('starts fresh on the next practice day without inheriting the previous completion state', async () => {
    const database = createAppDatabase('daily-practice-test-db');
    const user = userEvent.setup();
    const beforeMidnight = new Date('2026-04-26T23:55:00-05:00');
    const afterMidnight = new Date('2026-04-27T00:05:00-05:00');

    try {
      const firstRender = renderDailyPractice({
        database,
        now: beforeMidnight,
        timeZone: 'America/Chicago',
      });

      const previousTitle = (await screen.findByTestId('daily-practice-title')).textContent;

      await waitFor(() => {
        expect(screen.getByTestId('daily-status')).toHaveTextContent('Ready');
      });
      await user.click(screen.getByTestId('daily-complete'));
      await waitFor(() => {
        expect(screen.getByTestId('daily-status')).toHaveTextContent('Completed');
      });

      firstRender.unmount();

      renderDailyPractice({
        database,
        now: afterMidnight,
        timeZone: 'America/Chicago',
      });

      await waitFor(() => {
        expect(screen.getByTestId('daily-status')).toHaveTextContent('Ready');
      });
      expect(screen.getByTestId('daily-practice-title').textContent).not.toBe(previousTitle);
      expect(screen.getByTestId('daily-complete')).not.toBeDisabled();
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('surfaces a sermon reference in the deterministic rotation', () => {
    const sermonSelection = selectDailyPractice(new Date('2026-05-03T09:00:00-05:00'), 'America/Chicago');

    expect(sermonSelection.sourceKind).toBe('sermon-reference');
    expect(sermonSelection.document.slug).toBe('daily-practice-the-force-works-all-things-out');
    expect(sermonSelection.sourceHref).toBe('/library/sermons/daily-practice-the-force-works-all-things-out');
  });

  it('selects the correct practice day from a manual local datetime and override time zone', () => {
    const overrideSelection = selectDailyPracticeFromLocalDateTime('2026-04-27T00:05', 'America/Chicago');

    expect(overrideSelection?.practiceDayKey).toBe('2026-04-27');
    expect(overrideSelection?.entryIndex).toBe(1);
    expect(overrideSelection?.timeZone).toBe('America/Chicago');
  });

  it('reveals timing controls on the daily route and lets the reader enter a manual datetime and time zone', async () => {
    const database = createAppDatabase('daily-practice-test-db');
    const user = userEvent.setup();

    try {
      renderDailyPracticeRoute(database);

      await waitFor(() => {
        expect(screen.getByTestId('page-title')).toHaveTextContent('Today');
      });

      await user.click(screen.getByTestId('reader-controls-toggle'));
      await user.click(screen.getByTestId('reader-control-timing'));

      expect(screen.getByTestId('daily-clock-override-toggle')).toBeVisible();
      await user.click(screen.getByTestId('daily-clock-override-toggle'));
      await user.clear(screen.getByTestId('daily-clock-override-input'));
      await user.type(screen.getByTestId('daily-clock-override-input'), '2026-04-27T00:05');
      await user.clear(screen.getByTestId('daily-clock-override-time-zone'));
      await user.type(screen.getByTestId('daily-clock-override-time-zone'), 'America/Chicago');

      expect(screen.getByTestId('daily-clock-override-input')).toHaveValue('2026-04-27T00:05');
      expect(screen.getByTestId('daily-clock-override-time-zone')).toHaveValue('America/Chicago');
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });
});
