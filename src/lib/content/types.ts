export const authorityClasses = ['canonical', 'supplemental', 'sermon'] as const;
export const approvalStatuses = ['approved', 'review-required', 'blocked'] as const;
export const provenanceStatuses = ['recorded', 'needs-review', 'blocked'] as const;

export type DocumentAuthorityClass = (typeof authorityClasses)[number];
export type ApprovalStatus = (typeof approvalStatuses)[number];
export type ProvenanceStatus = (typeof provenanceStatuses)[number];
export type DocumentType = 'study-text' | 'sermon';
export type ContentOrigin = 'bundled' | 'synced';
export type DownloadStatus = 'queued' | 'ready' | 'failed';
export type PracticeKind = 'reading' | 'reflection' | 'meditation';
export type PersonalizationScope = 'global' | 'document';

export type LibraryCounts = {
  canonical: number;
  supplemental: number;
  sermon: number;
};

export type DocumentSource = {
  sourceType: string;
  sourceUrls: string[];
  attribution: string;
  approvalStatus: ApprovalStatus;
  provenanceStatus: ProvenanceStatus;
};

export type DocumentRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  authorityClass: DocumentAuthorityClass;
  documentType: DocumentType;
  sourceId: string;
  bodyMarkdown: string;
  tags: string[];
  version: number;
  checksum: string;
  origin: ContentOrigin;
  source: DocumentSource;
  sourceUrl: string | null;
  author: string | null;
  sortOrder: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type BundledDocumentSeed = Omit<DocumentRecord, 'checksum'> & {
  checksum?: string;
};

export type ContentBootstrapMetaRecord = {
  key: string;
  schemaVersion: number;
  bundledContentVersion: string;
  bundledContentChecksum: string;
  documentCount: number;
  seededAt: string;
  lastBootstrapAt: string;
  migratedFromSchemaVersion: number | null;
};

export type ProgressRecord = {
  id: string;
  documentId: string;
  progressPercent: number;
  lastAnchor: string | null;
  updatedAt: string;
};

export type BookmarkRecord = {
  id: string;
  documentId: string;
  anchor: string;
  label: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteRecord = {
  id: string;
  documentId: string;
  anchor: string | null;
  bodyMarkdown: string;
  createdAt: string;
  updatedAt: string;
};

export type PracticeHistoryRecord = {
  id: string;
  documentId: string | null;
  practiceKind: PracticeKind;
  completedAt: string;
  durationSeconds: number;
};

export type DownloadRecord = {
  id: string;
  documentId: string;
  status: DownloadStatus;
  storedChecksum: string;
  updatedAt: string;
};

export type PersonalizationRuleRecord = {
  id: string;
  scope: PersonalizationScope;
  documentId: string | null;
  token: string;
  replacement: string;
  enabled: boolean;
  updatedAt: string;
};

export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );

    return `{${entries
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value) ?? 'undefined';
}

export function createChecksum(value: unknown): string {
  const serialized = stableSerialize(value);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
