import Dexie, { type Table, type Transaction } from 'dexie';

import {
  type BookmarkRecord,
  type ContentBootstrapMetaRecord,
  type DocumentAuthorityClass,
  type DocumentRecord,
  type DocumentSource,
  type DocumentType,
  type DownloadRecord,
  type NoteRecord,
  type PersonalizationRuleRecord,
  type PracticeHistoryRecord,
  type ProgressRecord,
  createChecksum,
} from '@/lib/content';

export const CURRENT_DB_SCHEMA_VERSION = 3;
export const DEFAULT_DB_NAME = 'totjo-holocron';

type LegacyDocumentRecord = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  authorityClass?: DocumentAuthorityClass;
  documentType?: DocumentType;
  sourceId: string;
  bodyMarkdown: string;
  tags?: string[];
  version?: number;
  checksum?: string;
  origin?: 'bundled' | 'synced';
  source?: DocumentSource;
  sourceUrl?: string | null;
  author?: string | null;
  sortOrder?: number;
  publishedAt?: string | null;
  updatedAt?: string;
};

const migratedDocumentFallbackSource: DocumentSource = {
  sourceType: 'migration-placeholder',
  sourceUrls: [],
  attribution: 'Temple of the Jedi Order',
  approvalStatus: 'review-required',
  provenanceStatus: 'needs-review',
};

async function migrateDocuments(transaction: Transaction): Promise<void> {
  await transaction.table<LegacyDocumentRecord, string>('documents').toCollection().modify((document) => {
    const authorityClass = document.authorityClass ?? 'supplemental';
    const version = document.version ?? 1;

    document.summary ??= '';
    document.tags ??= [];
    document.documentType ??= authorityClass === 'sermon' ? 'sermon' : 'study-text';
    document.origin ??= 'bundled';
    document.source ??= { ...migratedDocumentFallbackSource };
    document.sourceUrl ??= document.source.sourceUrls[0] ?? null;
    document.author ??= null;
    document.sortOrder ??= 0;
    document.publishedAt ??= null;
    document.updatedAt ??= '1970-01-01T00:00:00.000Z';
    document.version = version;
    document.checksum ??= createChecksum({
      id: document.id,
      slug: document.slug,
        title: document.title,
        authorityClass,
        documentType: document.documentType,
        sourceId: document.sourceId,
        sourceUrl: document.sourceUrl,
        author: document.author,
        bodyMarkdown: document.bodyMarkdown,
        version,
      });
  });
}

export class HolocronDatabase extends Dexie {
  documents!: Table<DocumentRecord, string>;
  progress!: Table<ProgressRecord, string>;
  bookmarks!: Table<BookmarkRecord, string>;
  notes!: Table<NoteRecord, string>;
  practiceHistory!: Table<PracticeHistoryRecord, string>;
  downloads!: Table<DownloadRecord, string>;
  personalizationRules!: Table<PersonalizationRuleRecord, string>;
  bootstrapMeta!: Table<ContentBootstrapMetaRecord, string>;

  constructor(name = DEFAULT_DB_NAME) {
    super(name);

    this.version(1).stores({
      documents: '&id, slug, authorityClass, sourceId',
      progress: '&id, documentId, updatedAt',
      bookmarks: '&id, documentId, createdAt',
      notes: '&id, documentId, updatedAt',
      practiceHistory: '&id, documentId, completedAt',
      downloads: '&id, documentId, status, updatedAt',
      personalizationRules: '&id, documentId, updatedAt',
    });

    this.version(CURRENT_DB_SCHEMA_VERSION)
      .stores({
        documents: '&id, slug, authorityClass, documentType, sourceId, [authorityClass+documentType], updatedAt',
        progress: '&id, documentId, updatedAt',
        bookmarks: '&id, documentId, createdAt',
        notes: '&id, documentId, updatedAt',
        practiceHistory: '&id, documentId, practiceKind, completedAt',
        downloads: '&id, documentId, status, updatedAt',
        personalizationRules: '&id, scope, documentId, updatedAt',
        bootstrapMeta: '&key',
      })
      .upgrade(async (transaction) => {
        await migrateDocuments(transaction);
      });
  }
}

export function createAppDatabase(name?: string): HolocronDatabase {
  return new HolocronDatabase(name);
}

export const appDb = createAppDatabase();
