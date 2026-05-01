import type { DocumentRecord, DownloadRecord } from '@/lib/content';

export type SermonDocumentRecord = DocumentRecord & {
  authorityClass: 'sermon';
  documentType: 'sermon';
};

export type SermonManifest = {
  importedAt: string;
  checksum: string;
  documents: SermonDocumentRecord[];
};

export type SermonDetailAsset = {
  document: SermonDocumentRecord;
};

export type SermonCacheState = 'cached-sermon' | 'uncached-sermon';

export type SermonDownloadRecord = DownloadRecord & {
  id: `sermon-download:${string}`;
};
