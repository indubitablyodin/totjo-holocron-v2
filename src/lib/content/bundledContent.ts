import authorityPolicy from '../../../content/policy/content-authority.json';
import dailyPracticeSermonReference from '../../../content/supplemental/daily-practice/the-force-works-all-things-out-reference.json';
import knightsCodeContent from '../../../content/supplemental/knights-code.json';

import { createDoctrineSeeds } from './doctrineContent';
import {
  type BundledDocumentSeed,
  type ContentBootstrapMetaRecord,
  type DocumentAuthorityClass,
  type DocumentRecord,
  type DocumentSource,
  createChecksum,
} from './types';

type AuthorityEntry = {
  id: string;
  title: string;
  authorityClass: DocumentAuthorityClass;
  description: string;
  sourceType: string;
  sourceUrls: string[];
  approvalStatus: DocumentSource['approvalStatus'];
  provenanceStatus: DocumentSource['provenanceStatus'];
  attribution: string;
};

type BundledTextContent = {
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
  updatedAt: string;
};

const authorityEntries = authorityPolicy.entries as AuthorityEntry[];
const authorityEntryById = new Map(authorityEntries.map((entry) => [entry.id, entry]));
const bundledDailyPracticeSermonReference = dailyPracticeSermonReference as BundledTextContent & {
  author: string;
  sourceUrl: string;
  publishedAt: string;
};
const supplementalKnightsCode = knightsCodeContent as BundledTextContent;

export const BUNDLED_CONTENT_VERSION = '2026.04.27.4';
export const CONTENT_BOOTSTRAP_META_KEY = 'content-bootstrap';

function createSource(sourceId: string): DocumentSource {
  const sourceEntry = authorityEntryById.get(sourceId);

  if (!sourceEntry) {
    throw new Error(`Missing content authority entry for sourceId: ${sourceId}`);
  }

  return {
    sourceType: sourceEntry.sourceType,
    sourceUrls: sourceEntry.sourceUrls,
    attribution: sourceEntry.attribution,
    approvalStatus: sourceEntry.approvalStatus,
    provenanceStatus: sourceEntry.provenanceStatus,
  };
}

function createBundledDocument(seed: BundledDocumentSeed): DocumentRecord {
  const checksum = createChecksum({
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    authorityClass: seed.authorityClass,
    documentType: seed.documentType,
    sourceId: seed.sourceId,
    sourceUrl: seed.sourceUrl,
    author: seed.author,
    bodyMarkdown: seed.bodyMarkdown,
    version: seed.version,
  });

  return {
    ...seed,
    checksum,
    source: seed.source,
  };
}

export const bundledDocuments = [
  ...createDoctrineSeeds(createSource).map((document) => createBundledDocument(document)),
  createBundledDocument({
    id: 'supplemental-knights-code',
    slug: supplementalKnightsCode.slug,
    title: supplementalKnightsCode.title,
    summary: supplementalKnightsCode.summary,
    authorityClass: 'supplemental',
    documentType: 'study-text',
    sourceId: 'knights-code',
    bodyMarkdown: supplementalKnightsCode.bodyMarkdown,
    tags: supplementalKnightsCode.tags,
    version: 1,
    origin: 'bundled',
    source: createSource('knights-code'),
    sourceUrl: 'https://templeofthejediorder.org/doctrine',
    author: null,
    sortOrder: 110,
    publishedAt: null,
    updatedAt: supplementalKnightsCode.updatedAt,
  }),
  createBundledDocument({
    id: 'sermon-daily-practice-the-force-works-all-things-out',
    slug: bundledDailyPracticeSermonReference.slug,
    title: bundledDailyPracticeSermonReference.title,
    summary: bundledDailyPracticeSermonReference.summary,
    authorityClass: 'sermon',
    documentType: 'sermon',
    sourceId: 'daily-practice-sermon-the-force-works-all-things-out',
    bodyMarkdown: bundledDailyPracticeSermonReference.bodyMarkdown,
    tags: bundledDailyPracticeSermonReference.tags,
    version: 1,
    origin: 'bundled',
    source: createSource('daily-practice-sermon-the-force-works-all-things-out'),
    sourceUrl: bundledDailyPracticeSermonReference.sourceUrl,
    author: bundledDailyPracticeSermonReference.author,
    sortOrder: 900,
    publishedAt: bundledDailyPracticeSermonReference.publishedAt,
    updatedAt: bundledDailyPracticeSermonReference.updatedAt,
  }),
] satisfies DocumentRecord[];

export const bundledContentManifest = {
  version: BUNDLED_CONTENT_VERSION,
  checksum: createChecksum(
    bundledDocuments.map((document) => ({
      id: document.id,
      checksum: document.checksum,
      version: document.version,
    })),
  ),
  documentIds: bundledDocuments.map((document) => document.id),
};

export function createBootstrapMetaRecord(overrides: Partial<ContentBootstrapMetaRecord> = {}): ContentBootstrapMetaRecord {
  const now = new Date().toISOString();

  return {
    key: CONTENT_BOOTSTRAP_META_KEY,
    schemaVersion: 0,
    bundledContentVersion: bundledContentManifest.version,
    bundledContentChecksum: bundledContentManifest.checksum,
    documentCount: bundledDocuments.length,
    seededAt: now,
    lastBootstrapAt: now,
    migratedFromSchemaVersion: null,
    ...overrides,
  };
}
