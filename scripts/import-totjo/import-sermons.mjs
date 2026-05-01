import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { JSDOM } from 'jsdom';

const DEFAULT_ARCHIVE_URL = 'https://templeofthejediorder.org/sermons';
const CONTENT_AUTHORITY_PATH = new URL('../../content/policy/content-authority.json', import.meta.url);

class TotjoParseError extends Error {
  constructor(message) {
    super(`TOTJO parser error: ${message}`);
    this.name = 'TotjoParseError';
  }
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`).join(',')}}`;
  }

  return JSON.stringify(value) ?? 'undefined';
}

function createChecksum(value) {
  const serialized = stableSerialize(value);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeWhitespace(value) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function readText(node) {
  if (!node) {
    return '';
  }

  if (node.nodeType === node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return '';
  }

  const element = node;

  if (element.tagName === 'BR') {
    return '\n';
  }

  return Array.from(element.childNodes)
    .map((childNode) => readText(childNode))
    .join('');
}

function summarize(bodyMarkdown) {
  const firstParagraph = bodyMarkdown
    .split(/\n\n+/)
    .map((block) => normalizeWhitespace(block.replace(/^#+\s+/, '')))
    .find((block) => block.length > 0);

  if (!firstParagraph) {
    return 'Synced TOTJO sermon.';
  }

  return firstParagraph.length > 180 ? `${firstParagraph.slice(0, 177)}...` : firstParagraph;
}

function parseArchiveDate(dateText, context) {
  const match = normalizeWhitespace(dateText).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    throw new TotjoParseError(`${context}: expected archive date in DD/MM/YYYY format.`);
  }

  const [, day, month, year] = match;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
}

function getRequiredElement(parent, selector, context) {
  const element = parent.querySelector(selector);

  if (!element) {
    throw new TotjoParseError(`${context}: missing selector ${selector}.`);
  }

  return element;
}

async function loadAuthoritySource() {
  const raw = await readFile(CONTENT_AUTHORITY_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const entry = parsed.entries.find((candidate) => candidate.id === 'totjo-sermons');

  if (!entry) {
    throw new Error('Missing totjo-sermons entry in content authority policy.');
  }

  return {
    sourceType: entry.sourceType,
    sourceUrls: entry.sourceUrls,
    attribution: entry.attribution,
    approvalStatus: entry.approvalStatus,
    provenanceStatus: entry.provenanceStatus,
  };
}

function parseArchiveHtml(html, archiveUrl) {
  const document = new JSDOM(html).window.document;
  const rows = Array.from(document.querySelectorAll('.com-content-category__table tbody tr'));

  if (rows.length === 0) {
    throw new TotjoParseError('expected archive rows in .com-content-category__table tbody.');
  }

  return rows.map((row, index) => {
    const link = getRequiredElement(row, 'th.list-title a', `archive row ${index + 1}`);
    const title = normalizeWhitespace(link.textContent ?? '');
    const sourceUrl = new URL(link.getAttribute('href') ?? '', archiveUrl).toString();
    const slug = sourceUrl.split('/').filter(Boolean).at(-1);

    if (!slug) {
      throw new TotjoParseError(`archive row ${index + 1}: could not derive sermon slug.`);
    }

    return {
      slug,
      title,
      sourceUrl,
      author: normalizeWhitespace(getRequiredElement(row, '.list-author', `archive row ${slug}`).textContent ?? ''),
      publishedAt: parseArchiveDate(getRequiredElement(row, '.list-date', `archive row ${slug}`).textContent ?? '', `archive row ${slug}`),
      sortOrder: index,
    };
  });
}

function renderBodyMarkdown(articleBody, context) {
  const blocks = [];

  for (const child of Array.from(articleBody.children)) {
    const tagName = child.tagName.toLowerCase();

    if (tagName === 'p') {
      const paragraph = normalizeWhitespace(readText(child).replace(/\n+/g, ' \n '));

      if (paragraph) {
        blocks.push(paragraph.replace(/ \n /g, '\n'));
      }
      continue;
    }

    if (tagName === 'ul' || tagName === 'ol') {
      const items = Array.from(child.querySelectorAll(':scope > li')).map((item, index) => {
        const prefix = tagName === 'ol' ? `${index + 1}. ` : '- ';
        return `${prefix}${normalizeWhitespace(readText(item))}`;
      });

      if (items.length > 0) {
        blocks.push(items.join('\n'));
      }
      continue;
    }

    if (/^h[2-6]$/.test(tagName)) {
      const headingText = normalizeWhitespace(child.textContent ?? '');
      if (headingText) {
        blocks.push(`## ${headingText}`);
      }
      continue;
    }
  }

  if (blocks.length === 0) {
    throw new TotjoParseError(`${context}: article body did not contain readable blocks.`);
  }

  return blocks.join('\n\n');
}

function parseSermonDetailHtml(html, archiveEntry, importedAt, source) {
  const document = new JSDOM(html).window.document;
  const context = `detail ${archiveEntry.slug}`;
  const title = normalizeWhitespace(getRequiredElement(document, 'h1[itemprop="headline"]', context).textContent ?? '');
  const authorElement = getRequiredElement(document, '[itemprop="author"] [itemprop="name"]', context);
  const publishedElement = getRequiredElement(document, 'time[itemprop="datePublished"]', context);
  const articleBody = getRequiredElement(document, '[itemprop="articleBody"]', context);
  const author = normalizeWhitespace(authorElement.textContent ?? '');
  const publishedAt = publishedElement.getAttribute('datetime');

  if (!publishedAt) {
    throw new TotjoParseError(`${context}: missing datetime on time[itemprop="datePublished"].`);
  }

  const bodyMarkdown = renderBodyMarkdown(articleBody, context);
  const mergedSourceUrls = Array.from(new Set([...source.sourceUrls, archiveEntry.sourceUrl]));
  const baseDocument = {
    id: `sermon-${archiveEntry.slug}`,
    slug: archiveEntry.slug,
    title,
    summary: summarize(bodyMarkdown),
    authorityClass: 'sermon',
    documentType: 'sermon',
    sourceId: 'totjo-sermons',
    bodyMarkdown,
    tags: ['sermon', `author:${author.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, `year:${publishedAt.slice(0, 4)}`],
    version: 1,
    origin: 'synced',
    source: {
      ...source,
      sourceUrls: mergedSourceUrls,
    },
    sourceUrl: archiveEntry.sourceUrl,
    author,
    sortOrder: archiveEntry.sortOrder,
    publishedAt: new Date(publishedAt).toISOString(),
    updatedAt: importedAt,
  };

  return {
    ...baseDocument,
    checksum: createChecksum({
      id: baseDocument.id,
      slug: baseDocument.slug,
      title: baseDocument.title,
      authorityClass: baseDocument.authorityClass,
      documentType: baseDocument.documentType,
      sourceId: baseDocument.sourceId,
      sourceUrl: baseDocument.sourceUrl,
      author: baseDocument.author,
      bodyMarkdown: baseDocument.bodyMarkdown,
      version: baseDocument.version,
    }),
  };
}

function toManifestDocument(detailDocument) {
  const metadataDocument = {
    ...detailDocument,
    bodyMarkdown: '',
  };

  return {
    ...metadataDocument,
    checksum: createChecksum({
      id: metadataDocument.id,
      slug: metadataDocument.slug,
      title: metadataDocument.title,
      authorityClass: metadataDocument.authorityClass,
      documentType: metadataDocument.documentType,
      sourceId: metadataDocument.sourceId,
      sourceUrl: metadataDocument.sourceUrl,
      author: metadataDocument.author,
      bodyMarkdown: metadataDocument.bodyMarkdown,
      version: metadataDocument.version,
    }),
  };
}

async function readSource(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status}`);
    }
    return response.text();
  }

  return readFile(source, 'utf8');
}

async function readDetailHtml(entry, detailDir) {
  if (detailDir) {
    return readFile(path.join(detailDir, `${entry.slug}.html`), 'utf8');
  }

  const response = await fetch(entry.sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${entry.sourceUrl}: ${response.status}`);
  }
  return response.text();
}

async function importTotjoSermons({ archiveSources, detailDir, outputDir, importedAt }) {
  const source = await loadAuthoritySource();
  const archiveEntries = [];

  for (const archiveSource of archiveSources) {
    const archiveUrl = /^https?:\/\//.test(archiveSource) ? archiveSource : DEFAULT_ARCHIVE_URL;
    const html = await readSource(archiveSource);
    archiveEntries.push(...parseArchiveHtml(html, archiveUrl));
  }

  const uniqueEntries = Array.from(new Map(archiveEntries.map((entry) => [entry.slug, entry])).values()).map((entry, index) => ({
    ...entry,
    sortOrder: index,
  }));
  const detailDocuments = [];

  for (const entry of uniqueEntries) {
    const html = await readDetailHtml(entry, detailDir);
    detailDocuments.push(parseSermonDetailHtml(html, entry, importedAt, source));
  }

  await mkdir(outputDir, { recursive: true });

  for (const detailDocument of detailDocuments) {
    await writeFile(
      path.join(outputDir, `${detailDocument.slug}.json`),
      `${JSON.stringify({ document: detailDocument }, null, 2)}\n`,
      'utf8',
    );
  }

  const manifestDocuments = detailDocuments.map((document) => toManifestDocument(document));
  const manifest = {
    importedAt,
    checksum: createChecksum(
      manifestDocuments.map((document) => ({ id: document.id, slug: document.slug, checksum: document.checksum, version: document.version })),
    ),
    documents: manifestDocuments,
  };

  await writeFile(path.join(outputDir, 'index.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const options = {
    archiveSources: [],
    detailDir: null,
    outputDir: null,
    importedAt: '2026-04-27T00:00:00.000Z',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (argument === '--archive-file' || argument === '--archive-url') {
      options.archiveSources.push(next);
      index += 1;
      continue;
    }

    if (argument === '--detail-dir') {
      options.detailDir = next;
      index += 1;
      continue;
    }

    if (argument === '--output-dir') {
      options.outputDir = next;
      index += 1;
      continue;
    }

    if (argument === '--imported-at') {
      options.importedAt = next;
      index += 1;
    }
  }

  if (options.archiveSources.length === 0) {
    options.archiveSources.push(DEFAULT_ARCHIVE_URL);
  }

  if (!options.outputDir) {
    throw new Error('Missing required --output-dir argument.');
  }

  return options;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirectExecution) {
  const options = parseArgs(process.argv.slice(2));

  importTotjoSermons(options).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export { importTotjoSermons };
