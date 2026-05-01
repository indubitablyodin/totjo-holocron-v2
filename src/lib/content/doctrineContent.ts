import doctrineSourceFile from '../../../content/canon/doctrine/official-doctrine.json';

import type { BundledDocumentSeed } from './types';

type DoctrineContentKind = 'belief-list' | 'tenets' | 'code' | 'meditation' | 'numbered-list' | 'maxims';

type DoctrineSection = {
  title: string;
  body: string[];
};

type DoctrineVersion = {
  title: string;
  lines: string[];
};

type DoctrineStructuredDocument = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: DoctrineContentKind;
  sortOrder: number;
  intro: string[];
  items?: string[];
  tenets?: string[];
  sections?: DoctrineSection[];
  versions?: DoctrineVersion[];
  stanzas?: string[][];
  notes?: string[];
  attribution?: string;
  tags: string[];
};

type DoctrineStructuredSource = {
  documents: DoctrineStructuredDocument[];
};

const doctrineSource = doctrineSourceFile as DoctrineStructuredSource;

export const doctrineDocuments = doctrineSource.documents;

export const doctrineLibraryEntries = doctrineDocuments.map((document) => ({
  slug: document.slug,
  title: document.title,
  summary: document.summary,
}));

function renderOrderedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function renderBulletedList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

export function createDoctrineBodyMarkdown(document: DoctrineStructuredDocument): string {
  const blocks: string[] = [`# ${document.title}`, ...document.intro];

  switch (document.kind) {
    case 'belief-list':
      if (document.items) {
        blocks.push(renderBulletedList(document.items));
      }
      break;
    case 'tenets':
      if (document.tenets) {
        blocks.push(renderBulletedList(document.tenets));
      }

      for (const section of document.sections ?? []) {
        blocks.push(`## ${section.title}`);
        blocks.push(...section.body);
      }
      break;
    case 'code':
      for (const version of document.versions ?? []) {
        blocks.push(`## ${version.title}`);
        blocks.push(renderOrderedList(version.lines));
      }

      if (document.attribution) {
        blocks.push(document.attribution);
      }
      break;
    case 'meditation':
      for (const stanza of document.stanzas ?? []) {
        blocks.push(stanza.join('\n'));
      }

      if (document.attribution) {
        blocks.push(document.attribution);
      }
      break;
    case 'numbered-list':
      if (document.items) {
        blocks.push(renderOrderedList(document.items));
      }
      break;
    case 'maxims':
      if (document.items) {
        blocks.push(renderOrderedList(document.items));
      }

      if (document.notes && document.notes.length > 0) {
        blocks.push('## Notes');
        blocks.push(renderOrderedList(document.notes));
      }
      break;
  }

  return blocks.join('\n\n');
}

export function createDoctrineSeeds(createSource: (sourceId: string) => BundledDocumentSeed['source']): BundledDocumentSeed[] {
  return doctrineDocuments.map((document) => {
    const source = createSource('totjo-doctrine');

    return {
      id: document.id,
      slug: document.slug,
      title: document.title,
      summary: document.summary,
      authorityClass: 'canonical',
      documentType: 'study-text',
      sourceId: 'totjo-doctrine',
      bodyMarkdown: createDoctrineBodyMarkdown(document),
      tags: document.tags,
      version: 1,
      origin: 'bundled',
      source,
      sourceUrl: source.sourceUrls[0] ?? null,
      author: null,
      sortOrder: document.sortOrder,
      publishedAt: null,
      updatedAt: '2026-04-27T00:00:00.000Z',
    };
  });
}
