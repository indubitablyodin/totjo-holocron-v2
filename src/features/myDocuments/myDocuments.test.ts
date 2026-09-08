import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';

import { appDb, createAppDatabase, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

import {
  addMyDocument,
  createMyDocument,
  deleteMyDocument,
  listMyDocuments,
  MAX_MY_DOCUMENT_BYTES,
  parseProjectFile,
  parseProjectText,
  resolveUniqueSlug,
  slugify,
  validateMyDocumentInput,
} from './myDocuments';

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

const validInput = {
  title: 'My Practice Journal',
  summary: 'A private reflection on the practice.',
  bodyMarkdown: '## Entry one\n\nToday I practiced.',
  author: null,
  tags: ['personal'],
};

async function makeDatabase(name: string): Promise<HolocronDatabase> {
  const database = createAppDatabase(name);
  await ensureStorageReady(database);
  return database;
}

afterEach(async () => {
  if (appDb.isOpen()) {
    appDb.close();
  }
});

describe('slugify', () => {
  it('kebab-cases and sanitizes a title', () => {
    expect(slugify("My Practice Journal: Week 'One'!")).toBe('my-practice-journal-week-one');
  });

  it('falls back and trims properly', () => {
    expect(slugify('   ')).toBe('');
    expect(slugify('A.B.C')).toBe('a-b-c');
  });
});

describe('parseProjectText', () => {
  it('uses the first heading as the title and keeps the rest as body', () => {
    const parsed = parseProjectText('# The Way of the Jedi\n\nFirst paragraph here.\n\nSecond paragraph.');

    expect(parsed.title).toBe('The Way of the Jedi');
    expect(parsed.bodyMarkdown).toBe('First paragraph here.\n\nSecond paragraph.');
    expect(parsed.summary).toBe('First paragraph here.');
  });

  it('leaves the title empty when there is no heading', () => {
    const parsed = parseProjectText('Just a body with no heading.'.repeat(12));

    expect(parsed.title).toBe('');
    expect(parsed.bodyMarkdown.length).toBeGreaterThan(180);
    expect(parsed.summary.length).toBeLessThanOrEqual(183);
  });
});

describe('validateMyDocumentInput', () => {
  it('accepts valid input', () => {
    const result = validateMyDocumentInput(validInput);

    expect(result.ok).toBe(true);
  });

  it('rejects a missing title and body', () => {
    const result = validateMyDocumentInput({ ...validInput, title: '   ', bodyMarkdown: '' });

    expect(result).toEqual({
      ok: false,
      errors: ['A title is required.', 'The document needs a body to read.'],
    });
  });

  it('rejects an oversized body', () => {
    const result = validateMyDocumentInput({
      ...validInput,
      bodyMarkdown: 'a'.repeat(MAX_MY_DOCUMENT_BYTES + 1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(['The document is too large to store on this device.']);
    }
  });
});

function projectFile(raw: string, name: string, type: string): File {
  return {
    name,
    type,
    text: () => Promise.resolve(raw),
  } as unknown as File;
}

describe('parseProjectFile', () => {
  it('parses a markdown file', async () => {
    const result = await parseProjectFile(projectFile('# From File\n\nFile body.', 'notes.md', 'text/markdown'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.title).toBe('From File');
      expect(result.input.bodyMarkdown).toBe('File body.');
    }
  });

  it('reads a JSON document payload', async () => {
    const result = await parseProjectFile(
      projectFile(JSON.stringify({ title: 'Json Doc', summary: 's', bodyMarkdown: 'Body', tags: ['a'] }), 'doc.json', 'application/json'),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.title).toBe('Json Doc');
      expect(result.input.tags).toEqual(['a']);
    }
  });

  it('reports invalid JSON', async () => {
    const result = await parseProjectFile(projectFile('{oops', 'doc.json', 'application/json'));

    expect(result.ok).toBe(false);
  });
});

describe('createMyDocument', () => {
  it('builds a user-origin custom document with a checksum', () => {
    const document = createMyDocument(validInput, 'my-practice-journal', 'my-doc:test');

    expect(document).toMatchObject({
      id: 'my-doc:test',
      slug: 'my-practice-journal',
      authorityClass: 'custom',
      documentType: 'study-text',
      sourceId: 'my-documents',
      origin: 'user',
      author: null,
    });
    expect(document.checksum).toMatch(/^fnv1a-/);
  });
});

describe('database operations', () => {
  it('adds, lists, and resolves unique slugs for custom documents', async () => {
    const database = await makeDatabase('my-documents-basic-test');

    try {
      const first = await addMyDocument(database, validInput);
      const duplicate = await addMyDocument(database, validInput);

      expect(first.ok).toBe(true);
      expect(duplicate.ok).toBe(true);

      const documents = await listMyDocuments(database);
      expect(documents).toHaveLength(2);
      expect(documents.map((document) => document.slug).sort()).toEqual([
        'my-practice-journal',
        'my-practice-journal-2',
      ]);
      expect(await resolveUniqueSlug(database, 'My Practice Journal')).toBe('my-practice-journal-3');
    } finally {
      await deleteDatabase('my-documents-basic-test');
    }
  });

  it('reports validation errors without writing', async () => {
    const database = await makeDatabase('my-documents-validation-test');

    try {
      const result = await addMyDocument(database, { ...validInput, title: '' });

      expect(result.ok).toBe(false);
      const userDocuments = await database.documents.toArray();
      expect(userDocuments.filter((document) => document.origin === 'user')).toHaveLength(0);
    } finally {
      await deleteDatabase('my-documents-validation-test');
    }
  });

  it('cascades user state when a document is deleted', async () => {
    const database = await makeDatabase('my-documents-delete-test');

    try {
      await addMyDocument(database, validInput);
      const [document] = await listMyDocuments(database);

      await Promise.all([
        database.bookmarks.put({
          id: `bookmark:${document.id}:page-start`,
          documentId: document.id,
          anchor: 'page-start',
          label: 'Saved',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        database.notes.put({
          id: `note:${document.id}:page-start`,
          documentId: document.id,
          anchor: 'page-start',
          bodyMarkdown: 'Note body',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        database.progress.put({
          id: `progress:${document.id}`,
          documentId: document.id,
          progressPercent: 50,
          lastAnchor: 'intro',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        database.personalizationRules.put({
          id: `personal:${document.id}`,
          scope: 'document',
          documentId: document.id,
          token: 'foo',
          replacement: 'bar',
          enabled: true,
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ]);

      expect(await database.bookmarks.where('documentId').equals(document.id).count()).toBe(1);

      await deleteMyDocument(database, document.id);

      expect(await database.documents.get(document.id)).toBeUndefined();
      expect(await database.bookmarks.where('documentId').equals(document.id).count()).toBe(0);
      expect(await database.notes.where('documentId').equals(document.id).count()).toBe(0);
      expect(await database.progress.where('documentId').equals(document.id).count()).toBe(0);
      expect(await database.personalizationRules.where('documentId').equals(document.id).count()).toBe(0);
    } finally {
      await deleteDatabase('my-documents-delete-test');
    }
  });
});