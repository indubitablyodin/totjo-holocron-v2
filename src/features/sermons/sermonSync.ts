import type { DocumentRecord } from '@/lib/content';
import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

import type {
  SermonCacheState,
  SermonDetailAsset,
  SermonDocumentRecord,
  SermonDownloadRecord,
  SermonManifest,
} from './types';

type FetchJsonOptions = {
  forceNetwork?: boolean;
};

export function createSermonImportAssetPath(assetName: string, basePath = import.meta.env.BASE_URL): string {
  const safeBasePath = basePath || '/';
  const normalizedBasePath = safeBasePath.endsWith('/') ? safeBasePath : `${safeBasePath}/`;
  const normalizedAssetName = assetName.replace(/^\/+/, '');

  return `${normalizedBasePath}imports/totjo-sermons/${normalizedAssetName}`;
}

export const SERMON_INDEX_ASSET_PATH = createSermonImportAssetPath('index.json');

function createSermonDownloadId(documentId: string): SermonDownloadRecord['id'] {
  return `sermon-download:${documentId}`;
}

function createSermonDetailAssetPath(slug: string): string {
  return createSermonImportAssetPath(`${encodeURIComponent(slug)}.json`);
}

function isSermonDocument(document: DocumentRecord | undefined): document is SermonDocumentRecord {
  return document?.authorityClass === 'sermon' && document.documentType === 'sermon';
}

async function fetchJson<T>(path: string, options: FetchJsonOptions = {}): Promise<T> {
  const response = await fetch(path, {
    cache: options.forceNetwork ? 'no-cache' : 'default',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchSermonDetailDocument(
  slug: string,
  options: FetchJsonOptions = {},
): Promise<SermonDocumentRecord> {
  const detailAsset = await fetchJson<SermonDetailAsset>(createSermonDetailAssetPath(slug), options);

  if (!isSermonDocument(detailAsset.document) || detailAsset.document.slug !== slug) {
    throw new Error(`Sermon detail asset mismatch for slug: ${slug}`);
  }

  return detailAsset.document;
}

function sortSermons(left: SermonDocumentRecord, right: SermonDocumentRecord) {
  const leftPublished = left.publishedAt ?? '';
  const rightPublished = right.publishedAt ?? '';

  return rightPublished.localeCompare(leftPublished) || left.title.localeCompare(right.title);
}

export async function getSermonDownloadRecord(
  documentId: string,
  database: HolocronDatabase = appDb,
): Promise<SermonDownloadRecord | undefined> {
  await ensureStorageReady(database);

  return database.downloads.get(createSermonDownloadId(documentId)) as Promise<SermonDownloadRecord | undefined>;
}

export async function getSermonDocuments(database: HolocronDatabase = appDb): Promise<SermonDocumentRecord[]> {
  await ensureStorageReady(database);

  const documents = await database.documents
    .where('[authorityClass+documentType]')
    .equals(['sermon', 'sermon'])
    .toArray();

  return documents
    .filter((document): document is SermonDocumentRecord => isSermonDocument(document) && document.sourceId === 'totjo-sermons')
    .sort(sortSermons);
}

export async function getSermonDocumentBySlug(
  slug: string,
  database: HolocronDatabase = appDb,
): Promise<SermonDocumentRecord | undefined> {
  await ensureStorageReady(database);

  const document = await database.documents.where('slug').equals(slug).first();

  return isSermonDocument(document) ? document : undefined;
}

export function getSermonCacheState(
  document: Pick<SermonDocumentRecord, 'bodyMarkdown' | 'origin'> | null | undefined,
  downloadRecord: Pick<SermonDownloadRecord, 'status'> | null | undefined,
): SermonCacheState {
  return Boolean(document?.bodyMarkdown.trim()) && (document?.origin === 'bundled' || downloadRecord?.status === 'ready')
    ? 'cached-sermon'
    : 'uncached-sermon';
}

function hasReadyOfflineBody(
  existingDocument: SermonDocumentRecord | undefined,
  existingDownload: SermonDownloadRecord | undefined,
): existingDocument is SermonDocumentRecord {
  return Boolean(existingDocument?.bodyMarkdown.trim()) && existingDownload?.status === 'ready';
}

function mergeSyncedMetadata(
  manifestDocument: SermonDocumentRecord,
  existingDocument: SermonDocumentRecord | undefined,
  refreshedDocument: SermonDocumentRecord | undefined | null,
  existingDownload: SermonDownloadRecord | undefined,
): SermonDocumentRecord {
  if (refreshedDocument) {
    return refreshedDocument;
  }

  return hasReadyOfflineBody(existingDocument, existingDownload) ? existingDocument : manifestDocument;
}

export async function syncSermonArchive(database: HolocronDatabase = appDb): Promise<SermonDocumentRecord[]> {
  const manifest = await fetchJson<SermonManifest>(SERMON_INDEX_ASSET_PATH, { forceNetwork: true });
  await ensureStorageReady(database);

  const documentIds = manifest.documents.map((document) => document.id);
  const downloadIds = documentIds.map((documentId) => createSermonDownloadId(documentId));
  const existingDocuments = (await database.documents.bulkGet(documentIds)).filter(isSermonDocument);
  const existingDocumentMap = new Map(existingDocuments.map((document) => [document.id, document]));
  const existingDownloads = (await database.downloads.bulkGet(downloadIds)).filter(
    (record): record is SermonDownloadRecord => Boolean(record),
  );
  const existingDownloadMap = new Map(existingDownloads.map((record) => [record.documentId, record]));
  const refreshedDocuments = await Promise.all(
    manifest.documents.map(async (document) => {
      const existingDocument = existingDocumentMap.get(document.id);
      const existingDownload = existingDownloadMap.get(document.id);

      if (!hasReadyOfflineBody(existingDocument, existingDownload)) {
        return [document.id, null] as const;
      }

      try {
        const refreshedDocument = await fetchSermonDetailDocument(document.slug, { forceNetwork: true });
        return [document.id, refreshedDocument] as const;
      } catch {
        // Keep the existing offline copy if refreshing its detail fails.
        return [document.id, null] as const;
      }
    }),
  );
  const refreshedDocumentMap = new Map(refreshedDocuments);
  const now = new Date().toISOString();

  await database.transaction('rw', database.documents, database.downloads, async () => {
    const documentsToStore = manifest.documents.map((document) =>
      mergeSyncedMetadata(
        document,
        existingDocumentMap.get(document.id),
        refreshedDocumentMap.get(document.id),
        existingDownloadMap.get(document.id),
      ),
    );

    await database.documents.bulkPut(documentsToStore);

    const nextDownloads = documentsToStore.map((document): SermonDownloadRecord | null => {
      if (!document.bodyMarkdown.trim()) {
        return null;
      }

      const existingDownload = existingDownloadMap.get(document.id);

      if (existingDownload) {
        return {
          ...existingDownload,
          status: 'ready' as const,
          storedChecksum: document.checksum,
          updatedAt: now,
        };
      }

      return {
        id: createSermonDownloadId(document.id),
        documentId: document.id,
        status: 'ready' as const,
        storedChecksum: document.checksum,
        updatedAt: now,
      };
    }).filter((d): d is SermonDownloadRecord => d !== null);

    if (nextDownloads.length > 0) {
      await database.downloads.bulkPut(nextDownloads);
    }
  });

  return getSermonDocuments(database);
}

export async function saveSermonForOffline(
  slug: string,
  database: HolocronDatabase = appDb,
): Promise<SermonDocumentRecord> {
  await ensureStorageReady(database);

  const sermonDocument = await fetchSermonDetailDocument(slug, { forceNetwork: true });

  const now = new Date().toISOString();
  const downloadRecord: SermonDownloadRecord = {
    id: createSermonDownloadId(sermonDocument.id),
    documentId: sermonDocument.id,
    status: 'ready',
    storedChecksum: sermonDocument.checksum,
    updatedAt: now,
  };

  await database.transaction('rw', database.documents, database.downloads, async () => {
    await database.documents.put(sermonDocument);
    await database.downloads.put(downloadRecord);
  });

  return sermonDocument;
}
