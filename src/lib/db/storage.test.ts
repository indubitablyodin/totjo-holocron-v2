import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';

import {
  CONTENT_BOOTSTRAP_META_KEY,
  bundledContentManifest,
  bundledDocuments,
} from '@/lib/content';
import {
  appDb,
  createAppDatabase,
  CURRENT_DB_SCHEMA_VERSION,
  ensureStorageReady,
  getLibraryCounts,
  type HolocronDatabase,
} from '@/lib/db';

async function deleteDatabase(name: string): Promise<void> {
  if (appDb.name === name && appDb.isOpen()) {
    appDb.close();
  }

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

async function createLegacyDatabase(name: string): Promise<void> {
  await deleteDatabase(name);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      const documents = database.createObjectStore('documents', { keyPath: 'id' });
      documents.createIndex('slug', 'slug');
      documents.createIndex('authorityClass', 'authorityClass');
      documents.createIndex('sourceId', 'sourceId');

      const progress = database.createObjectStore('progress', { keyPath: 'id' });
      progress.createIndex('documentId', 'documentId');
      progress.createIndex('updatedAt', 'updatedAt');

      const bookmarks = database.createObjectStore('bookmarks', { keyPath: 'id' });
      bookmarks.createIndex('documentId', 'documentId');
      bookmarks.createIndex('createdAt', 'createdAt');

      const notes = database.createObjectStore('notes', { keyPath: 'id' });
      notes.createIndex('documentId', 'documentId');
      notes.createIndex('updatedAt', 'updatedAt');

      const practiceHistory = database.createObjectStore('practiceHistory', { keyPath: 'id' });
      practiceHistory.createIndex('documentId', 'documentId');
      practiceHistory.createIndex('completedAt', 'completedAt');

      const downloads = database.createObjectStore('downloads', { keyPath: 'id' });
      downloads.createIndex('documentId', 'documentId');
      downloads.createIndex('status', 'status');
      downloads.createIndex('updatedAt', 'updatedAt');

      const personalizationRules = database.createObjectStore('personalizationRules', { keyPath: 'id' });
      personalizationRules.createIndex('documentId', 'documentId');
      personalizationRules.createIndex('updatedAt', 'updatedAt');
    };

    request.onerror = () => reject(request.error ?? new Error(`Failed to create legacy database ${name}`));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(
        ['documents', 'progress', 'bookmarks', 'notes', 'practiceHistory', 'downloads', 'personalizationRules'],
        'readwrite',
      );

      transaction.objectStore('documents').put({
        id: 'legacy-canon',
        slug: 'legacy-canon',
        title: 'Legacy Doctrine Document',
        authorityClass: 'canonical',
        sourceId: 'totjo-doctrine',
        bodyMarkdown: '# Legacy Doctrine\n\nMigrated content should survive schema upgrades.',
      });
      transaction.objectStore('progress').put({
        id: 'legacy-canon:default',
        documentId: 'legacy-canon',
        progressPercent: 40,
        lastAnchor: 'intro',
        updatedAt: '2026-04-27T00:00:00.000Z',
      });

      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error(`Failed to seed legacy database ${name}`));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error(`Legacy database transaction aborted for ${name}`));
      };
    };
  });
}

afterEach(async () => {
  if (appDb.isOpen()) {
    appDb.close();
  }
});

describe('storage', () => {
  it('bootstraps bundled documents and manifest metadata', async () => {
    const database = createAppDatabase('storage-bootstrap-test');

    try {
      await ensureStorageReady(database);

      const counts = await getLibraryCounts(database);
      const bootstrapMeta = await database.bootstrapMeta.get(CONTENT_BOOTSTRAP_META_KEY);

      expect(counts.canonical).toBeGreaterThan(0);
      expect(counts.supplemental).toBeGreaterThan(0);
      expect(counts.sermon).toBe(0);
      expect(await database.documents.count()).toBe(bundledDocuments.length);
      expect(bootstrapMeta).toMatchObject({
        schemaVersion: CURRENT_DB_SCHEMA_VERSION,
        bundledContentVersion: bundledContentManifest.version,
        bundledContentChecksum: bundledContentManifest.checksum,
        documentCount: bundledDocuments.length,
      });
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });

  it('migrates an older schema version without losing stored data', async () => {
    const databaseName = 'storage-migration-test';
    await createLegacyDatabase(databaseName);

    const database = createAppDatabase(databaseName);

    try {
      await ensureStorageReady(database);

      const migratedDocument = await database.documents.get('legacy-canon');
      const preservedProgress = await database.progress.get('legacy-canon:default');
      const bootstrapMeta = await database.bootstrapMeta.get(CONTENT_BOOTSTRAP_META_KEY);

      expect(migratedDocument).toMatchObject({
        id: 'legacy-canon',
        authorityClass: 'canonical',
        documentType: 'study-text',
        sourceUrl: null,
        author: null,
        version: 1,
      });
      expect(migratedDocument?.checksum).toMatch(/^fnv1a-/);
      expect(preservedProgress).toMatchObject({
        documentId: 'legacy-canon',
        progressPercent: 40,
        lastAnchor: 'intro',
      });
      expect(bootstrapMeta).toMatchObject({
        schemaVersion: CURRENT_DB_SCHEMA_VERSION,
        bundledContentVersion: bundledContentManifest.version,
      });
      expect(await database.documents.where('authorityClass').equals('canonical').count()).toBeGreaterThan(0);
    } finally {
      await closeAndDeleteDatabase(database);
    }
  });
});
