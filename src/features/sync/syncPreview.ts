import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

export type SyncPreview = {
  dailyItems: Array<{ id: string; label: string }>;
  bookmarks: Array<{ id: string; label: string }>;
  notes: Array<{ id: string; bodyMarkdown: string }>;
};

export async function loadSyncPreview(database: HolocronDatabase = appDb): Promise<SyncPreview> {
  await ensureStorageReady(database);

  const [documents, bookmarks, notes, practiceHistory] = await Promise.all([
    database.documents.toArray(),
    database.bookmarks.toArray(),
    database.notes.toArray(),
    database.practiceHistory.toArray(),
  ]);
  const documentTitles = new Map(documents.map((document) => [document.id, document.title]));

  return {
    dailyItems: practiceHistory
      .filter((record) => record.id.startsWith('daily-practice:'))
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt) || left.id.localeCompare(right.id))
      .map((record) => ({
        id: record.id,
        label: documentTitles.get(record.documentId ?? '') ?? record.documentId ?? 'Unknown daily item',
      })),
    bookmarks: bookmarks
      .sort((left, right) => left.documentId.localeCompare(right.documentId) || left.anchor.localeCompare(right.anchor))
      .map((record) => ({
        id: record.id,
        label: record.label,
      })),
    notes: notes
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id))
      .map((record) => ({
        id: record.id,
        bodyMarkdown: record.bodyMarkdown,
      })),
  };
}
