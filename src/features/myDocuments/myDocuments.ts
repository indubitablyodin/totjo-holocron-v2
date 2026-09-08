import {
  type DocumentRecord,
  type DocumentSource,
  createChecksum,
} from '@/lib/content';
import { ensureStorageReady, type HolocronDatabase } from '@/lib/db';

export const MY_DOCUMENTS_SOURCE_ID = 'my-documents';
export const MAX_MY_DOCUMENT_BYTES = 512 * 1024;
export const MAX_MY_DOCUMENT_TITLE_LENGTH = 140;

export type MyDocumentRecord = DocumentRecord & {
  authorityClass: 'custom';
  documentType: 'study-text';
};

export type MyDocumentInput = {
  title: string;
  summary: string;
  bodyMarkdown: string;
  author: string | null;
  tags: string[];
};

export type MyDocumentValidationResult =
  | { ok: true; input: MyDocumentInput }
  | { ok: false; errors: string[] };

export type ParsedProjectText = {
  title: string;
  summary: string;
  bodyMarkdown: string;
};

function createMyDocumentSource(): DocumentSource {
  return {
    sourceType: MY_DOCUMENTS_SOURCE_ID,
    sourceUrls: [],
    attribution: 'My documents',
    approvalStatus: 'approved',
    provenanceStatus: 'recorded',
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function validateMyDocumentInput(raw: {
  title: string;
  summary: string;
  bodyMarkdown: string;
  author: string | null;
  tags: string[];
}): MyDocumentValidationResult {
  const errors: string[] = [];
  const title = raw.title.trim();
  const bodyMarkdown = raw.bodyMarkdown.trim();

  if (!title) {
    errors.push('A title is required.');
  } else if (title.length > MAX_MY_DOCUMENT_TITLE_LENGTH) {
    errors.push(`The title must be under ${MAX_MY_DOCUMENT_TITLE_LENGTH} characters.`);
  }

  if (!bodyMarkdown) {
    errors.push('The document needs a body to read.');
  }

  if (new TextEncoder().encode(bodyMarkdown).length > MAX_MY_DOCUMENT_BYTES) {
    errors.push('The document is too large to store on this device.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      title,
      summary: raw.summary.trim(),
      bodyMarkdown,
      author: raw.author?.trim() || null,
      tags: raw.tags.filter((tag) => tag.trim().length > 0),
    },
  };
}

export function parseProjectText(text: string): ParsedProjectText {
  const lines = text.split('\n');
  const titleMatch = lines[0].match(/^\s*#\s+(.+?)\s*$/);

  const title = titleMatch ? titleMatch[1] : '';
  const bodyStart = titleMatch ? 1 : 0;
  const bodyMarkdown = lines.slice(bodyStart).join('\n').trim();
  const summary = bodyMarkdown.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim().slice(0, 180);

  return { title, summary, bodyMarkdown };
}

export async function parseProjectFile(file: File): Promise<MyDocumentValidationResult> {
  const raw = await file.text();

  if (/\.json$/i.test(file.name)) {
    try {
      const payload = JSON.parse(raw) as Partial<MyDocumentRecord>;
      return validateMyDocumentInput({
        title: String(payload.title ?? ''),
        summary: String(payload.summary ?? ''),
        bodyMarkdown: String(payload.bodyMarkdown ?? ''),
        author: typeof payload.author === 'string' ? payload.author : null,
        tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
      });
    } catch {
      return { ok: false, errors: ['This JSON file could not be read as a document.'] };
    }
  }

  const parsed = parseProjectText(raw);

  return validateMyDocumentInput({
    title: parsed.title,
    summary: parsed.summary,
    bodyMarkdown: parsed.bodyMarkdown,
    author: null,
    tags: [],
  });
}

export function createMyDocument(input: MyDocumentInput, slug: string, id: string): MyDocumentRecord {
  const now = new Date().toISOString();
  const document: MyDocumentRecord = {
    id,
    slug,
    title: input.title,
    summary: input.summary,
    authorityClass: 'custom',
    documentType: 'study-text',
    sourceId: MY_DOCUMENTS_SOURCE_ID,
    bodyMarkdown: input.bodyMarkdown,
    tags: input.tags,
    version: 1,
    origin: 'user',
    source: createMyDocumentSource(),
    sourceUrl: null,
    author: input.author,
    sortOrder: 1_000_000,
    publishedAt: null,
    updatedAt: now,
    checksum: '',
  };

  document.checksum = createChecksum({
    id: document.id,
    slug: document.slug,
    title: document.title,
    authorityClass: document.authorityClass,
    documentType: document.documentType,
    sourceId: document.sourceId,
    sourceUrl: document.sourceUrl,
    author: document.author,
    bodyMarkdown: document.bodyMarkdown,
    version: document.version,
  });

  return document;
}

export async function resolveUniqueSlug(database: HolocronDatabase, base: string): Promise<string> {
  const safeBase = slugify(base) || 'untitled';
  let candidate = safeBase;
  let index = 2;

  while ((await database.documents.where('slug').equals(candidate).count()) > 0) {
    candidate = `${safeBase}-${index}`;
    index += 1;
  }

  return candidate;
}

export function isMyDocument(document: DocumentRecord): document is MyDocumentRecord {
  return document.authorityClass === 'custom' && document.documentType === 'study-text';
}

export async function addMyDocument(
  database: HolocronDatabase,
  raw: MyDocumentInput,
): Promise<MyDocumentValidationResult> {
  await ensureStorageReady(database);

  const validation = validateMyDocumentInput(raw);

  if (!validation.ok) {
    return validation;
  }

  const now = new Date().toISOString();
  const id = `my-doc:${crypto.randomUUID()}`;
  const slug = await resolveUniqueSlug(database, validation.input.title);
  const document = createMyDocument(validation.input, slug, id);

  await database.transaction('rw', database.documents, async () => {
    await database.documents.put({ ...document, updatedAt: now });
  });

  return { ok: true, input: validation.input };
}

export async function listMyDocuments(database: HolocronDatabase): Promise<MyDocumentRecord[]> {
  await ensureStorageReady(database);

  const documents = await database.documents.where('authorityClass').equals('custom').toArray();

  return documents
    .filter(isMyDocument)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function deleteMyDocument(database: HolocronDatabase, documentId: string): Promise<void> {
  await ensureStorageReady(database);

  await database.transaction(
    'rw',
    database.documents,
    database.bookmarks,
    database.notes,
    database.progress,
    database.personalizationRules,
    async () => {
      await database.documents.delete(documentId);
      await database.bookmarks.where('documentId').equals(documentId).delete();
      await database.notes.where('documentId').equals(documentId).delete();
      await database.progress.where('documentId').equals(documentId).delete();
      await database.personalizationRules.where('documentId').equals(documentId).delete();
    },
  );
}