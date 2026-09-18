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

// =============================================================================
// Date Parsing
// =============================================================================

const MONTH_MAP = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

function parseDateDDMMYYYY(dateText) {
  const match = normalizeWhitespace(dateText).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
}

function parseDateDDMonthYYYY(dateText) {
  const match = normalizeWhitespace(dateText).match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);

  if (!match) {
    return null;
  }

  const [, day, monthName, year] = match;
  const monthNumber = MONTH_MAP[monthName.toLowerCase()];

  if (!monthNumber) {
    return null;
  }

  const month = String(monthNumber).padStart(2, '0');
  const dayPadded = String(parseInt(day, 10)).padStart(2, '0');
  return new Date(`${year}-${month}-${dayPadded}T00:00:00.000Z`).toISOString();
}

function parseArchiveDate(dateText, context) {
  const result = parseDateDDMMYYYY(dateText) || parseDateDDMonthYYYY(dateText);

  if (!result) {
    throw new TotjoParseError(`${context}: unable to parse date. Expected DD/MM/YYYY or DD Month YYYY format.`);
  }

  return result;
}

// =============================================================================
// Archive Page Parsing - Old Format (Joomla com-content-category)
// =============================================================================

function parseArchiveHtmlOld(html, archiveUrl) {
  const document = new JSDOM(html).window.document;
  const rows = Array.from(document.querySelectorAll('.com-content-category__table tbody tr'));

  if (rows.length === 0) {
    throw new TotjoParseError('old format: expected archive rows in .com-content-category__table tbody.');
  }

  return rows.map((row, index) => {
    const link = row.querySelector('th.list-title a');
    if (!link) {
      throw new TotjoParseError(`old format: missing selector th.list-title a in archive row ${index + 1}.`);
    }

    const title = normalizeWhitespace(link.textContent ?? '');
    const sourceUrl = new URL(link.getAttribute('href') ?? '', archiveUrl).toString();
    const slug = sourceUrl.split('/').filter(Boolean).at(-1);

    if (!slug) {
      throw new TotjoParseError(`old format: archive row ${index + 1}: could not derive sermon slug.`);
    }

    const authorElement = row.querySelector('.list-author');
    const dateElement = row.querySelector('.list-date');

    if (!authorElement) {
      throw new TotjoParseError(`old format: missing .list-author in archive row ${slug}.`);
    }
    if (!dateElement) {
      throw new TotjoParseError(`old format: missing .list-date in archive row ${slug}.`);
    }

    return {
      slug,
      title,
      sourceUrl,
      author: normalizeWhitespace(authorElement.textContent ?? ''),
      publishedAt: parseArchiveDate(dateElement.textContent ?? '', `old format archive row ${slug}`),
      sortOrder: index,
    };
  });
}

// =============================================================================
// Archive Page Parsing - New Format (Markdown-style table)
// =============================================================================

function parseArchiveHtmlNew(html, archiveUrl) {
  const document = new JSDOM(html).window.document;
  
  // Find all tables and look for the one with sermon links
  const tables = Array.from(document.querySelectorAll('table'));
  
  // Find the table that has links to /sermons/ - this is the archive table
  let targetTable = null;
  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const linkRows = rows.filter(row => row.querySelector('a[href*="/sermons/"]'));
    if (linkRows.length > 0) {
      targetTable = table;
      break;
    }
  }

  if (!targetTable) {
    throw new TotjoParseError('new format: could not find sermon archive table.');
  }

  const rows = Array.from(targetTable.querySelectorAll('tbody tr'));

  if (rows.length === 0) {
    throw new TotjoParseError('new format: expected rows in archive table.');
  }

  const entries = [];

  for (const row of rows) {
    const link = row.querySelector('a[href*="/sermons/"]');
    if (!link) {
      continue; // Skip rows without sermon links (like headers)
    }

    const title = normalizeWhitespace(link.textContent ?? '');
    const sourceUrl = new URL(link.getAttribute('href') ?? '', archiveUrl).toString();
    const slug = sourceUrl.split('/').filter(Boolean).at(-1);

    if (!slug) {
      continue;
    }

    // In the new format, the date is typically in the second td
    const cells = Array.from(row.querySelectorAll('td'));
    const dateText = cells.length >= 2 ? normalizeWhitespace(cells[1].textContent ?? '') : '';
    
    // Author is not available in the new archive format - we'll get it from detail page
    const author = '';
    const publishedAt = dateText ? parseArchiveDate(dateText, `new format archive row ${slug}`) : '';

    entries.push({
      slug,
      title,
      sourceUrl,
      author,
      publishedAt,
      sortOrder: entries.length,
    });
  }

  if (entries.length === 0) {
    throw new TotjoParseError('new format: no sermon entries found in archive table.');
  }

  return entries;
}

// =============================================================================
// Archive Page Parsing - Main Function (tries both formats)
// =============================================================================

function parseArchiveHtml(html, archiveUrl) {
  // Try old format first (for backward compatibility with test fixtures)
  try {
    const oldResults = parseArchiveHtmlOld(html, archiveUrl);
    if (oldResults.length > 0) {
      return oldResults;
    }
  } catch {
    // Old format failed, try new format
  }

  // Try new format
  try {
    return parseArchiveHtmlNew(html, archiveUrl);
  } catch (error) {
    // If both fail, throw the new format error (or old if available)
    throw new TotjoParseError(`Failed to parse archive page with both old and new formats: ${error.message}`);
  }
}

// =============================================================================
// Detail Page Parsing - Body Rendering (shared between old and new)
// =============================================================================

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

// =============================================================================
// Detail Page Parsing - Old Format (with microdata)
// =============================================================================

function parseSermonDetailHtmlOld(html, archiveEntry, importedAt, source) {
  const document = new JSDOM(html).window.document;
  const context = `old format detail ${archiveEntry.slug}`;
  
  const titleElement = document.querySelector('h1[itemprop="headline"]');
  const authorElement = document.querySelector('[itemprop="author"] [itemprop="name"]');
  const publishedElement = document.querySelector('time[itemprop="datePublished"]');
  const articleBody = document.querySelector('[itemprop="articleBody"]');

  if (!titleElement) {
    throw new TotjoParseError(`${context}: missing h1[itemprop="headline"].`);
  }
  if (!authorElement) {
    throw new TotjoParseError(`${context}: missing [itemprop="author"] [itemprop="name"].`);
  }
  if (!publishedElement) {
    throw new TotjoParseError(`${context}: missing time[itemprop="datePublished"].`);
  }
  if (!articleBody) {
    throw new TotjoParseError(`${context}: missing [itemprop="articleBody"].`);
  }

  const title = normalizeWhitespace(titleElement.textContent ?? '');
  const author = normalizeWhitespace(authorElement.textContent ?? '');
  const publishedAt = publishedElement.getAttribute('datetime');

  if (!publishedAt) {
    throw new TotjoParseError(`${context}: missing datetime on time[itemprop="datePublished"].`);
  }

  const bodyMarkdown = renderBodyMarkdown(articleBody, context);
  const mergedSourceUrls = Array.from(new Set([...source.sourceUrls, archiveEntry.sourceUrl]));
  
  // Use author from archive if available, otherwise from detail page
  const finalAuthor = archiveEntry.author || author;
  const finalPublishedAt = archiveEntry.publishedAt || new Date(publishedAt).toISOString();

  const baseDocument = {
    id: `sermon-${archiveEntry.slug}`,
    slug: archiveEntry.slug,
    title,
    summary: summarize(bodyMarkdown),
    authorityClass: 'sermon',
    documentType: 'sermon',
    sourceId: 'totjo-sermons',
    bodyMarkdown,
    tags: ['sermon', `author:${finalAuthor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, `year:${finalPublishedAt.slice(0, 4)}`],
    version: 1,
    origin: 'synced',
    source: {
      ...source,
      sourceUrls: mergedSourceUrls,
    },
    sourceUrl: archiveEntry.sourceUrl,
    author: finalAuthor,
    sortOrder: archiveEntry.sortOrder,
    publishedAt: finalPublishedAt,
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

// =============================================================================
// Detail Page Parsing - New Format (plain HTML)
// =============================================================================

function parseSermonDetailHtmlNew(html, archiveEntry, importedAt, source) {
  const document = new JSDOM(html).window.document;
  const context = `new format detail ${archiveEntry.slug}`;
  
  // Find the main heading (h1) - should be the sermon title
  const titleElement = document.querySelector('h1');
  if (!titleElement) {
    throw new TotjoParseError(`${context}: missing h1 title element.`);
  }

  const title = normalizeWhitespace(titleElement.textContent ?? '');

  // Extract author from "Written by: AuthorName" text in paragraphs
  let author = archiveEntry.author || '';
  if (!author) {
    const writtenByMatch = html.match(/Written\s+by:\s*([^<\n]+)/i);
    if (writtenByMatch) {
      author = normalizeWhitespace(writtenByMatch[1]);
    }
  }

  // Extract date - look for various date formats in the text
  let publishedAt = archiveEntry.publishedAt || '';
  if (!publishedAt) {
    // Try to find a date in the format DD Month YYYY (e.g., "28 August 2026")
    const dateMatch = html.match(/(\d{1,2}\s+\w+\s+\d{4})/);
    if (dateMatch) {
      const parsed = parseDateDDMonthYYYY(dateMatch[1]);
      if (parsed) {
        publishedAt = parsed;
      }
    }
  }

  // Find the article body - look for the main content area
  // In the new format, we need to find all <p> tags that are the actual body content
  // and exclude metadata paragraphs like "Written by: ..." and date paragraphs
  const allParagraphs = Array.from(document.querySelectorAll('body p'));
  
  // Filter out metadata paragraphs (short paragraphs that look like metadata)
  const bodyParagraphs = allParagraphs.filter(p => {
    const text = normalizeWhitespace(p.textContent ?? '');
    // Exclude paragraphs that match metadata patterns
    if (text.match(/^written\s+by:/i)) return false;
    if (text.match(/^\d{1,2}\s+\w+\s+\d{4}$/)) return false; // Date pattern
    if (text.length < 10) return false; // Very short paragraphs are likely metadata
    return true;
  });

  // Create a temporary container for the body paragraphs
  const tempBody = document.createElement('div');
  bodyParagraphs.forEach(p => {
    const clone = p.cloneNode(true);
    tempBody.appendChild(clone);
  });

  // If we have body paragraphs, use them; otherwise fall back to the entire body
  let articleBody = tempBody;
  if (bodyParagraphs.length === 0) {
    articleBody = document.body;
  }

  const bodyMarkdown = renderBodyMarkdown(articleBody, context);
  const mergedSourceUrls = Array.from(new Set([...source.sourceUrls, archiveEntry.sourceUrl]));

  // If we couldn't get author from archive or "Written by", try to extract from the page
  if (!author || author === 'Unknown') {
    const authorMatch = html.match(/Author:\s*([^\n<]+)/i) || 
                        html.match(/by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (authorMatch) {
      author = normalizeWhitespace(authorMatch[1]);
    }
  }

  const finalAuthor = author || 'Unknown';
  const finalPublishedAt = publishedAt || new Date().toISOString();

  const baseDocument = {
    id: `sermon-${archiveEntry.slug}`,
    slug: archiveEntry.slug,
    title,
    summary: summarize(bodyMarkdown),
    authorityClass: 'sermon',
    documentType: 'sermon',
    sourceId: 'totjo-sermons',
    bodyMarkdown,
    tags: ['sermon', `author:${finalAuthor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, `year:${finalPublishedAt.slice(0, 4)}`],
    version: 1,
    origin: 'synced',
    source: {
      ...source,
      sourceUrls: mergedSourceUrls,
    },
    sourceUrl: archiveEntry.sourceUrl,
    author: finalAuthor,
    sortOrder: archiveEntry.sortOrder,
    publishedAt: finalPublishedAt,
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

// =============================================================================
// Detail Page Parsing - Main Function (tries both formats)
// =============================================================================

function parseSermonDetailHtml(html, archiveEntry, importedAt, source) {
  // Try old format first (for backward compatibility with test fixtures)
  try {
    return parseSermonDetailHtmlOld(html, archiveEntry, importedAt, source);
  } catch {
    // Old format failed, try new format
  }

  // Try new format
  try {
    return parseSermonDetailHtmlNew(html, archiveEntry, importedAt, source);
  } catch (error) {
    // If both fail, throw a combined error
    throw new TotjoParseError(`Failed to parse detail page with both old and new formats for ${archiveEntry.slug}: ${error.message}`);
  }
}

// =============================================================================
// Import Logic
// =============================================================================

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

function parseArgs(argv) {
  const options = {
    archiveSources: [],
    detailDir: null,
    outputDir: null,
    importedAt: new Date().toISOString(),
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
