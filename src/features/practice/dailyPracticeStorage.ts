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
