import type { DocumentRecord } from '@/lib/content/types';

export type HolocronAuthorityClass =
  | 'doctrine'
  | 'supplemental'
  | 'sermon'
  | 'practice'
  | 'community';

export type HolocronRelationKind =
  | 'explains'
  | 'quotes'
  | 'supports'
  | 'contrasts'
  | 'practice'
  | 'source'
  | 'related';

export type HolocronSection = {
  id: string;
  title?: string;
  bodyMarkdown: string;
  order: number;
};

export type HolocronReference = {
  id: string;
  fromDocumentId: string;
  fromSectionId?: string;
  toDocumentId: string;
  toSectionId?: string;
  relation: HolocronRelationKind;
  label?: string;
};

export type HolocronDocument = {
  id: string;
  slug: string;
  title: string;
  authorityClass: HolocronAuthorityClass;
  summary: string;
  sourceUrl?: string;
  tags: string[];
  sections: HolocronSection[];
  references?: HolocronReference[];
  author?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const AUTHORITY_CLASS_MAP: Record<string, HolocronAuthorityClass> = {
  canonical: 'doctrine',
  supplemental: 'supplemental',
  sermon: 'sermon',
};

export function getHolocronAuthorityClass(
  authorityClass: string,
): HolocronAuthorityClass {
  return AUTHORITY_CLASS_MAP[authorityClass] ?? 'community';
}

export function getDocumentTitle(document: HolocronDocument): string {
  return document.title;
}

export function getDocumentSections(document: HolocronDocument): HolocronSection[] {
  return document.sections;
}

export function getDocumentPlainText(document: HolocronDocument): string {
  return document.sections.map((section) => section.bodyMarkdown).join('\n\n');
}

export function getAuthorityLabel(authorityClass: HolocronAuthorityClass): string {
  switch (authorityClass) {
    case 'doctrine':
      return 'Doctrine Text';
    case 'supplemental':
      return 'Study Text';
    case 'sermon':
      return 'TOTJO Sermon';
    case 'practice':
      return 'Practice';
    case 'community':
      return 'Community';
  }
}

export function getDocumentRoute(document: HolocronDocument): string {
  switch (document.authorityClass) {
    case 'doctrine':
      return `/library/doctrine/${document.slug}`;
    case 'supplemental':
      return `/library/supplemental/${document.slug}`;
    case 'sermon':
      return `/library/sermons/${document.slug}`;
    default:
      return `/library`;
  }
}

export function normalizeDocumentRecord(record: DocumentRecord): HolocronDocument {
  const authorityClass = getHolocronAuthorityClass(record.authorityClass);
  const body = record.bodyMarkdown || '';
  const lines = body.split('\n').filter((line) => line.trim().length > 0);

  const sections: HolocronSection[] =
    lines.length > 0
      ? lines.map((line, index) => ({
          id: `${record.slug}-section-${index + 1}`,
          bodyMarkdown: line.trim(),
          order: index + 1,
        }))
      : [
          {
            id: `${record.slug}-section-1`,
            bodyMarkdown: record.summary,
            order: 1,
          },
        ];

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    authorityClass,
    summary: record.summary,
    sourceUrl: record.sourceUrl ?? undefined,
    tags: record.tags,
    sections,
    author: record.author,
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
  };
}
