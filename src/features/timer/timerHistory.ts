import { createChecksum, type PracticeHistoryRecord } from '@/lib/content';
import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

type RecordMeditationPracticeInput = {
  completedAt: string;
  durationSeconds: number;
};

function createMeditationHistoryId(input: RecordMeditationPracticeInput): string {
  const randomSuffix =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : createChecksum({
          ...input,
          nonce: Date.now(),
        });

  return `meditation:${randomSuffix}`;
}

export async function recordMeditationPractice(
  input: RecordMeditationPracticeInput,
  database: HolocronDatabase = appDb,
): Promise<PracticeHistoryRecord> {
  await ensureStorageReady(database);

  const record: PracticeHistoryRecord = {
    id: createMeditationHistoryId(input),
    documentId: null,
    practiceKind: 'meditation',
    completedAt: input.completedAt,
    durationSeconds: input.durationSeconds,
  };

  await database.practiceHistory.put(record);

  return record;
}

export async function listMeditationPracticeHistory(
  limit = 5,
  database: HolocronDatabase = appDb,
): Promise<PracticeHistoryRecord[]> {
  await ensureStorageReady(database);

  const entries = await database.practiceHistory.where('practiceKind').equals('meditation').toArray();

  return entries
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .slice(0, Math.max(0, limit));
}

export async function clearMeditationPracticeHistory(database: HolocronDatabase = appDb): Promise<void> {
  await ensureStorageReady(database);

  const meditationEntries = await database.practiceHistory.where('practiceKind').equals('meditation').toArray();

  await database.practiceHistory.bulkDelete(meditationEntries.map((entry) => entry.id));
}
