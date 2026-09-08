import type { AudioFileRecord } from '@/lib/content';
import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

function createAudioFileId(): string {
  const randomSuffix =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `audio-file:${randomSuffix}`;
}

function stripAudioExtension(filename: string): string {
  return filename.replace(/\.(mp3|wav|flac|aiff|aif|ogg|webm|m4a|aac)$/i, '');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

async function decodeAudioDuration(arrayBuffer: ArrayBuffer): Promise<number> {
  const audioContext = new OfflineAudioContext(1, 1, 44100);
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer.duration;
}

async function convertWavToMp3(
  arrayBuffer: ArrayBuffer,
  onProgress?: (message: string) => void,
): Promise<{ blob: Blob; mimeType: string }> {
  try {
    const { decode, encode } = await import('audiobox');

    onProgress?.('Decoding audio…');
    const audio = await decode(new Uint8Array(arrayBuffer));

    onProgress?.('Compressing to MP3…');
    const mp3Data = await encode(audio, 'mp3', { bitrate: 192 });
    const mp3Bytes = mp3Data.slice().buffer as ArrayBuffer;

    return {
      blob: new Blob([mp3Bytes], { type: 'audio/mpeg' }),
      mimeType: 'audio/mpeg',
    };
  } catch {
    return { blob: new Blob([arrayBuffer], { type: 'audio/wav' }), mimeType: 'audio/wav' };
  }
}

export type UploadAudioFileInput = {
  file: File;
  onProgress?: (message: string) => void;
};

export type UploadAudioFileResult = {
  record: AudioFileRecord;
  compressed: boolean;
  originalSize: number;
  storedSize: number;
};

export async function uploadAudioFile(
  input: UploadAudioFileInput,
  database: HolocronDatabase = appDb,
): Promise<UploadAudioFileResult> {
  const { file, onProgress } = input;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`);
  }

  if (file.size === 0) {
    throw new Error('File is empty.');
  }

  const mimeType = file.type || 'audio/mpeg';
  const arrayBuffer = await file.arrayBuffer();
  const originalSize = file.size;

  onProgress?.('Reading audio…');
  let storedBlob: Blob;
  let storedMimeType: string;
  let compressed = false;

  const isWav =
    mimeType === 'audio/wav' ||
    mimeType === 'audio/wave' ||
    mimeType === 'audio/x-wav' ||
    file.name.toLowerCase().endsWith('.wav');

  if (isWav && file.size > 1024 * 1024) {
    const result = await convertWavToMp3(arrayBuffer, onProgress);
    storedBlob = result.blob;
    storedMimeType = result.mimeType;
    compressed = true;
  } else {
    storedBlob = new Blob([arrayBuffer], { type: mimeType });
    storedMimeType = mimeType;
  }

  onProgress?.('Getting duration…');
  let durationSeconds: number;

  try {
    durationSeconds = await decodeAudioDuration(arrayBuffer);
  } catch {
    throw new Error('Could not read audio file. The file may be corrupted or in an unsupported format.');
  }

  const record: AudioFileRecord = {
    id: createAudioFileId(),
    name: stripAudioExtension(file.name),
    originalName: file.name,
    mimeType: storedMimeType,
    blob: storedBlob,
    durationSeconds,
    sizeBytes: storedBlob.size,
    createdAt: new Date().toISOString(),
  };

  await ensureStorageReady(database);
  await database.audioFiles.put(record);

  return {
    record,
    compressed,
    originalSize,
    storedSize: record.sizeBytes,
  };
}

export async function listAudioFiles(
  database: HolocronDatabase = appDb,
): Promise<AudioFileRecord[]> {
  await ensureStorageReady(database);
  const files = await database.audioFiles.toArray();
  return files.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getAudioFile(
  id: string,
  database: HolocronDatabase = appDb,
): Promise<AudioFileRecord | undefined> {
  await ensureStorageReady(database);
  return database.audioFiles.get(id);
}

export async function deleteAudioFile(
  id: string,
  database: HolocronDatabase = appDb,
): Promise<void> {
  await ensureStorageReady(database);
  await database.audioFiles.delete(id);
}

export async function renameAudioFile(
  id: string,
  newName: string,
  database: HolocronDatabase = appDb,
): Promise<void> {
  await ensureStorageReady(database);
  await database.audioFiles.update(id, { name: newName });
}

export async function getAudioFilesTotalSize(
  database: HolocronDatabase = appDb,
): Promise<number> {
  await ensureStorageReady(database);
  const files = await database.audioFiles.toArray();
  return files.reduce((total, file) => total + file.sizeBytes, 0);
}

export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return { used: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export { formatFileSize, formatDuration };
