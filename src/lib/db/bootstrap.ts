import {
  type ContentBootstrapMetaRecord,
  type DocumentRecord,
  type LibraryCounts,
  bundledContentManifest,
  bundledDocuments,
  createBootstrapMetaRecord,
  CONTENT_BOOTSTRAP_META_KEY,
} from '@/lib/content';

import { appDb, CURRENT_DB_SCHEMA_VERSION, type HolocronDatabase } from './appDb';

let sharedBootstrapPromise: Promise<void> | null = null;

/** Reset the cached bootstrap promise so the next ensureStorageReady call re-seeds the database. */
export function resetBootstrapState(): void {
  sharedBootstrapPromise = null;
}

function needsBundledContentBootstrap(existingMeta: ContentBootstrapMetaRecord | undefined): boolean {
  if (!existingMeta) {
    return true;
  }

  return (
    existingMeta.bundledContentVersion !== bundledContentManifest.version ||
    existingMeta.bundledContentChecksum !== bundledContentManifest.checksum ||
    existingMeta.documentCount !== bundledDocuments.length ||
    existingMeta.schemaVersion !== CURRENT_DB_SCHEMA_VERSION
  );
}

async function bootstrapBundledContent(database: HolocronDatabase): Promise<void> {
  const existingMeta = await database.bootstrapMeta.get(CONTENT_BOOTSTRAP_META_KEY);

  if (!needsBundledContentBootstrap(existingMeta)) {
    return;
  }

  const now = new Date().toISOString();

  await database.transaction('rw', database.documents, database.bootstrapMeta, async () => {
    await database.documents.bulkPut(bundledDocuments);
    await database.documents.delete('sermon-public-archive-placeholder');

    await database.bootstrapMeta.put(
      createBootstrapMetaRecord({
        key: CONTENT_BOOTSTRAP_META_KEY,
        schemaVersion: CURRENT_DB_SCHEMA_VERSION,
        bundledContentVersion: bundledContentManifest.version,
        bundledContentChecksum: bundledContentManifest.checksum,
        documentCount: bundledDocuments.length,
        seededAt: existingMeta?.seededAt ?? now,
        lastBootstrapAt: now,
        migratedFromSchemaVersion:
          existingMeta && existingMeta.schemaVersion < CURRENT_DB_SCHEMA_VERSION
            ? existingMeta.schemaVersion
            : existingMeta?.migratedFromSchemaVersion ?? null,
      }),
    );
  });
}

async function openAndBootstrap(database: HolocronDatabase): Promise<void> {
  await database.open();
  await bootstrapBundledContent(database);
}

export async function ensureStorageReady(database: HolocronDatabase = appDb): Promise<void> {
  if (database !== appDb) {
    await openAndBootstrap(database);
    return;
  }

  sharedBootstrapPromise ??= openAndBootstrap(database).catch((error: unknown) => {
    sharedBootstrapPromise = null;
    throw error;
  });
  await sharedBootstrapPromise;
}

export async function getLibraryCounts(database: HolocronDatabase = appDb): Promise<LibraryCounts> {
  await ensureStorageReady(database);

  const [canonical, supplemental, sermonDocuments] = await Promise.all([
    database.documents.where('authorityClass').equals('canonical').count(),
    database.documents.where('authorityClass').equals('supplemental').count(),
    database.documents.where('authorityClass').equals('sermon').toArray(),
  ]);

  const sermon = sermonDocuments.filter((document) => document.sourceId === 'totjo-sermons').length;

  return { canonical, supplemental, sermon };
}

export async function getLibraryDocuments(database: HolocronDatabase = appDb): Promise<DocumentRecord[]> {
  await ensureStorageReady(database);

  const documents = await database.documents.toArray();

  return documents.sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
}

export async function getLibraryDocumentBySlug(
  slug: string,
  database: HolocronDatabase = appDb,
): Promise<DocumentRecord | undefined> {
  await ensureStorageReady(database);

  return database.documents.where('slug').equals(slug).first();
}

export async function getDocumentBySlug(
  slug: string,
  database: HolocronDatabase = appDb,
): Promise<DocumentRecord | undefined> {
  return getLibraryDocumentBySlug(slug, database);
}
