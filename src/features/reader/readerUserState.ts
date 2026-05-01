import type { BookmarkRecord, NoteRecord } from '@/lib/content';
import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

export const READER_STATE_ANCHOR = 'page-start';

function createReaderBookmarkId(documentId: string) {
  return `bookmark:${documentId}:${READER_STATE_ANCHOR}`;
}

function createReaderNoteId(documentId: string) {
  return `note:${documentId}:${READER_STATE_ANCHOR}`;
}

export type ReaderUserState = {
  bookmark: BookmarkRecord | null;
  note: NoteRecord | null;
};

export async function loadReaderUserState(
  documentId: string,
  database: HolocronDatabase = appDb,
): Promise<ReaderUserState> {
  await ensureStorageReady(database);

  const [bookmarks, notes] = await Promise.all([
    database.bookmarks.where('documentId').equals(documentId).toArray(),
    database.notes.where('documentId').equals(documentId).toArray(),
  ]);

  return {
    bookmark: bookmarks.find((bookmark) => bookmark.anchor === READER_STATE_ANCHOR) ?? null,
    note: notes.find((note) => note.anchor === READER_STATE_ANCHOR) ?? null,
  };
}

export async function saveReaderBookmark(
  {
    documentId,
    label,
    existingBookmark,
  }: {
    documentId: string;
    label: string;
    existingBookmark?: BookmarkRecord | null;
  },
  database: HolocronDatabase = appDb,
): Promise<BookmarkRecord> {
  await ensureStorageReady(database);

  const now = new Date().toISOString();
  const record: BookmarkRecord = {
    id: existingBookmark?.id ?? createReaderBookmarkId(documentId),
    documentId,
    anchor: READER_STATE_ANCHOR,
    label,
    createdAt: existingBookmark?.createdAt ?? now,
    updatedAt: now,
  };

  await database.bookmarks.put(record);

  return record;
}

export async function saveReaderNote(
  {
    documentId,
    bodyMarkdown,
    existingNote,
  }: {
    documentId: string;
    bodyMarkdown: string;
    existingNote?: NoteRecord | null;
  },
  database: HolocronDatabase = appDb,
): Promise<NoteRecord> {
  await ensureStorageReady(database);

  const now = new Date().toISOString();
  const record: NoteRecord = {
    id: existingNote?.id ?? createReaderNoteId(documentId),
    documentId,
    anchor: READER_STATE_ANCHOR,
    bodyMarkdown,
    createdAt: existingNote?.createdAt ?? now,
    updatedAt: now,
  };

  await database.notes.put(record);

  return record;
}
