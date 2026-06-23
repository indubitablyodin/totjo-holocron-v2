import type { HolocronDatabase } from '@/lib/db';
import { loadTimerPreferences } from '@/features/timer/timerPreferences';
import { loadReadingSettings } from '@/features/settings/readingSettings';

export type ExportData = {
  exportedAt: string;
  appVersion: string;
  notes: Array<{
    documentTitle: string;
    documentRoute: string;
    bodyMarkdown: string;
    createdAt: string;
    updatedAt: string;
  }>;
  bookmarks: Array<{
    documentTitle: string;
    documentRoute: string;
    label: string;
    createdAt: string;
  }>;
  practiceHistory: Array<{
    completedAt: string;
    practiceKind: string;
    durationSeconds: number;
  }>;
  settings: Record<string, string>;
};

export function createExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `totjo-holocron-export-${date}.md`;
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function formatUserDataMarkdown(data: ExportData): string {
  const lines: string[] = [];

  lines.push('# TOTJO Holocron Export');
  lines.push('');
  lines.push(`Exported: ${data.exportedAt.slice(0, 10)}`);
  lines.push(`App version: ${data.appVersion}`);
  lines.push('');

  // Notes
  lines.push('## Notes');
  lines.push('');

  if (data.notes.length === 0) {
    lines.push('No notes yet.');
    lines.push('');
  } else {
    for (const note of data.notes) {
      lines.push(`### Note on ${note.documentTitle}`);
      lines.push('');
      lines.push(`Source: ${note.documentTitle}`);
      lines.push(`Route: ${note.documentRoute}`);
      lines.push(`Created: ${formatDate(note.createdAt)}`);
      lines.push(`Updated: ${formatDate(note.updatedAt)}`);
      lines.push('');
      lines.push(note.bodyMarkdown);
      lines.push('');
    }
  }

  // Bookmarks
  lines.push('## Bookmarks');
  lines.push('');

  if (data.bookmarks.length === 0) {
    lines.push('No bookmarks yet.');
    lines.push('');
  } else {
    for (const bm of data.bookmarks) {
      lines.push(`- [${escapePipe(bm.documentTitle)}](${bm.documentRoute}) — ${escapePipe(bm.label)} — ${formatDate(bm.createdAt)}`);
    }
    lines.push('');
  }

  // Practice history
  lines.push('## Practice History');
  lines.push('');

  if (data.practiceHistory.length === 0) {
    lines.push('No practice history yet.');
    lines.push('');
  } else {
    lines.push('| Date | Practice | Duration |');
    lines.push('|---|---|---|');
    for (const entry of data.practiceHistory) {
      const date = formatDate(entry.completedAt);
      const kind = escapePipe(entry.practiceKind);
      const dur = `${entry.durationSeconds} sec`;
      lines.push(`| ${date} | ${kind} | ${dur} |`);
    }
    lines.push('');
  }

  // Settings
  lines.push('## Settings');
  lines.push('');

  for (const [key, value] of Object.entries(data.settings)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');

  return lines.join('\n');
}

export async function collectUserDataExport(
  database: HolocronDatabase,
): Promise<ExportData> {
  const [notes, bookmarks, practiceHistory, timerPrefs, readingSettings] = await Promise.all([
    database.notes.toArray(),
    database.bookmarks.toArray(),
    database.practiceHistory.toArray(),
    Promise.resolve(loadTimerPreferences()),
    Promise.resolve(loadReadingSettings()),
  ]);

  // Resolve document titles and routes for notes and bookmarks
  const docIds = new Set<string>();
  for (const note of notes) {
    docIds.add(note.documentId);
  }
  for (const bm of bookmarks) {
    docIds.add(bm.documentId);
  }

  const documents = await database.documents.where('id').anyOf([...docIds]).toArray();
  const docMap = new Map(documents.map((d) => [d.id, { title: d.title, slug: d.slug, authorityClass: d.authorityClass }]));

  function getDocRoute(documentId: string): string {
    const doc = docMap.get(documentId);
    if (!doc) return '/library';
    if (doc.authorityClass === 'sermon') return `/library/sermons/${doc.slug}`;
    if (doc.authorityClass === 'canonical') return `/library/doctrine/${doc.slug}`;
    return `/library/supplemental/${doc.slug}`;
  }

  function getDocTitle(documentId: string): string {
    return docMap.get(documentId)?.title ?? 'Unknown document';
  }

  return {
    exportedAt: new Date().toISOString(),
    appVersion: '0.1.0-rc.1',
    notes: notes.map((note) => ({
      documentTitle: getDocTitle(note.documentId),
      documentRoute: getDocRoute(note.documentId),
      bodyMarkdown: note.bodyMarkdown,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
    bookmarks: bookmarks.map((bm) => ({
      documentTitle: getDocTitle(bm.documentId),
      documentRoute: getDocRoute(bm.documentId),
      label: bm.label,
      createdAt: bm.createdAt,
    })),
    practiceHistory: practiceHistory.map((entry) => ({
      completedAt: entry.completedAt,
      practiceKind: entry.practiceKind,
      durationSeconds: entry.durationSeconds,
    })),
    settings: {
      'Timer default': `${timerPrefs.defaultDurationSeconds} sec`,
      'Cue mode': timerPrefs.defaultCueMode,
      'Sound profile': timerPrefs.defaultSoundProfileId,
      'Record history': timerPrefs.recordPracticeHistory ? 'true' : 'false',
      'Theme': readingSettings.theme,
      'Font scale': readingSettings.fontScale,
      'Contrast': readingSettings.contrast,
    },
  };
}

export function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
