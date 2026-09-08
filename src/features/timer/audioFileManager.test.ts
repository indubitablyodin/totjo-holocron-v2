import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AudioFileRecord } from '@/lib/content';
import { createAppDatabase, type HolocronDatabase } from '@/lib/db';

import {
  deleteAudioFile,
  formatDuration,
  formatFileSize,
  getAudioFile,
  getAudioFilesTotalSize,
  listAudioFiles,
  renameAudioFile,
  uploadAudioFile,
} from './audioFileManager';

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

function makeRecord(id: string, name: string, createdAt: string): AudioFileRecord {
  return {
    id,
    name,
    originalName: `${name}.mp3`,
    mimeType: 'audio/mpeg',
    blob: new Blob(['sample'], { type: 'audio/mpeg' }),
    durationSeconds: 60,
    sizeBytes: 6,
    createdAt,
  };
}

afterEach(async () => {
  await deleteDatabase('audio-file-manager-test');
  vi.unstubAllGlobals();
});

describe('audioFileManager', () => {
  it('lists, gets, renames, sizes, and deletes stored audio files', async () => {
    const database = createAppDatabase('audio-file-manager-test');

    try {
      await database.audioFiles.put(makeRecord('audio-file:older', 'Older Track', '2026-01-02T00:00:00.000Z'));
      await database.audioFiles.put(makeRecord('audio-file:newer', 'Newer Track', '2026-01-03T00:00:00.000Z'));

      const files = await listAudioFiles(database);
      expect(files.map((file) => file.id)).toEqual(['audio-file:newer', 'audio-file:older']);

      const newest = await getAudioFile('audio-file:newer', database);
      expect(newest?.name).toBe('Newer Track');

      await renameAudioFile('audio-file:older', 'Renamed Track', database);
      expect((await getAudioFile('audio-file:older', database))?.name).toBe('Renamed Track');

      expect(await getAudioFilesTotalSize(database)).toBe(12);

      await deleteAudioFile('audio-file:older', database);
      expect(await getAudioFile('audio-file:older', database)).toBeUndefined();
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('rejects files over the maximum size and empty files without reading them', async () => {
    const database = createAppDatabase('audio-file-manager-test');

    try {
      const oversized = {
        name: 'huge.wav',
        type: 'audio/wav',
        size: 200 * 1024 * 1024 + 1,
      } as File;

      await expect(uploadAudioFile({ file: oversized }, database)).rejects.toThrow(/too large/i);

      const empty = {
        name: 'empty.mp3',
        type: 'audio/mpeg',
        size: 0,
      } as File;

      await expect(uploadAudioFile({ file: empty }, database)).rejects.toThrow(/empty/i);
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('stores an mp3 upload as-is with a stripped name and decoded duration', async () => {
    class FakeOfflineAudioContext {
      decodeAudioData(): Promise<{ duration: number }> {
        return Promise.resolve({ duration: 125 });
      }
    }

    vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);

    const database = createAppDatabase('audio-file-manager-test');
    const progressMessages: string[] = [];

    try {
      const file = {
        name: 'Guided Breathwork.mp3',
        type: 'audio/mpeg',
        size: 4,
        arrayBuffer: async () => new Uint8Array([0, 1, 2, 3]).buffer,
      } as unknown as File;

      const result = await uploadAudioFile(
        { file, onProgress: (message) => progressMessages.push(message) },
        database,
      );

      expect(result.compressed).toBe(false);
      expect(result.originalSize).toBe(4);
      expect(result.storedSize).toBe(4);
      expect(result.record.name).toBe('Guided Breathwork');
      expect(result.record.mimeType).toBe('audio/mpeg');
      expect(result.record.durationSeconds).toBe(125);
      expect(progressMessages).toContain('Getting duration…');

      const persisted = await getAudioFile(result.record.id, database);
      expect(persisted?.id).toBe(result.record.id);
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('rejects an upload when the audio duration cannot be decoded', async () => {
    class BrokenOfflineAudioContext {
      decodeAudioData(): Promise<never> {
        return Promise.reject(new Error('decode failed'));
      }
    }

    vi.stubGlobal('OfflineAudioContext', BrokenOfflineAudioContext);

    const database = createAppDatabase('audio-file-manager-test');

    try {
      const file = {
        name: 'broken.mp3',
        type: 'audio/mpeg',
        size: 4,
        arrayBuffer: async () => new Uint8Array([0, 1, 2, 3]).buffer,
      } as unknown as File;

      await expect(uploadAudioFile({ file }, database)).rejects.toThrow(/could not read audio/i);
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('formats sizes and durations for display', () => {
    expect(formatFileSize(900)).toBe('900 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(420)).toBe('7:00');
  });
});