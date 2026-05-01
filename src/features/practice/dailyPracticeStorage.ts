import type { PracticeHistoryRecord } from '@/lib/content';
import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

export type DailyPracticeCompletionInput = {
  practiceDayId: string;
  documentId: string;
  completedAt: string;
};

export function createDailyPracticeCompletionId(practiceDayId: string): string {
  return `daily-practice:${practiceDayId}`;
}

export async function getDailyPracticeCompletion(
  practiceDayId: string,
  database: HolocronDatabase = appDb,
): Promise<PracticeHistoryRecord | undefined> {
  await ensureStorageReady(database);

  return database.practiceHistory.get(createDailyPracticeCompletionId(practiceDayId));
}

export async function markDailyPracticeCompleted(
  input: DailyPracticeCompletionInput,
  database: HolocronDatabase = appDb,
): Promise<PracticeHistoryRecord> {
  await ensureStorageReady(database);

  const record: PracticeHistoryRecord = {
    id: createDailyPracticeCompletionId(input.practiceDayId),
    documentId: input.documentId,
    practiceKind: 'reading',
    completedAt: input.completedAt,
    durationSeconds: 0,
  };

  await database.practiceHistory.put(record);

  return record;
}

function getLocalPracticeDayKey(completedAt: string, timeZone: string): string | null {
  const completedDate = new Date(completedAt);

  if (Number.isNaN(completedDate.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(completedDate);
  const getPart = (type: 'year' | 'month' | 'day') => parts.find((part) => part.type === type)?.value;
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function addDaysToLocalDayKey(dayKey: string, dayOffset: number): string {
  const [year, month, day] = dayKey.split('-').map((part) => Number.parseInt(part, 10));
  const nextDate = new Date(Date.UTC(year, month - 1, day + dayOffset));

  return `${nextDate.getUTCFullYear()}-${`${nextDate.getUTCMonth() + 1}`.padStart(2, '0')}-${`${nextDate.getUTCDate()}`.padStart(2, '0')}`;
}

export type MeditationPracticeStats = {
  totalDistinctDays: number;
  currentStreakDays: number;
};

export async function getMeditationPracticeStats(
  now: Date,
  timeZone: string,
  database: HolocronDatabase = appDb,
): Promise<MeditationPracticeStats> {
  await ensureStorageReady(database);

  const meditationEntries = await database.practiceHistory.where('practiceKind').equals('meditation').toArray();
  const meditationDays = new Set(
    meditationEntries
      .filter((entry) => entry.durationSeconds > 0)
      .map((entry) => getLocalPracticeDayKey(entry.completedAt, timeZone))
      .filter((dayKey): dayKey is string => dayKey !== null),
  );
  let currentStreakDays = 0;
  const todayKey = getLocalPracticeDayKey(now.toISOString(), timeZone);
  let cursorDayKey = todayKey && meditationDays.has(todayKey) ? todayKey : todayKey ? addDaysToLocalDayKey(todayKey, -1) : null;

  while (cursorDayKey && meditationDays.has(cursorDayKey)) {
    currentStreakDays += 1;
    cursorDayKey = addDaysToLocalDayKey(cursorDayKey, -1);
  }

  return {
    totalDistinctDays: meditationDays.size,
    currentStreakDays,
  };
}
