import { describe, expect, it } from 'vitest';

import { formatUserDataMarkdown, createExportFilename, type ExportData } from './exportUserData';

const EMPTY_EXPORT: ExportData = {
  exportedAt: '2026-06-23T00:00:00.000Z',
  appVersion: '0.1.0-rc.1',
  notes: [],
  bookmarks: [],
  practiceHistory: [],
  settings: { Theme: 'dark', 'Font scale': 'standard' },
  myDocuments: [],
};

const FULL_EXPORT: ExportData = {
  exportedAt: '2026-06-23T00:00:00.000Z',
  appVersion: '0.1.0-rc.1',
  notes: [
    {
      documentTitle: 'Jedi Believe',
      documentRoute: '/library/doctrine/jedi-believe',
      bodyMarkdown: 'My personal note content.',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-15T00:00:00.000Z',
    },
  ],
  bookmarks: [
    {
      documentTitle: 'The Code',
      documentRoute: '/library/doctrine/code',
      label: 'Important passage',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ],
  practiceHistory: [
    {
      completedAt: '2026-06-22T14:00:00.000Z',
      practiceKind: 'meditation',
      durationSeconds: 300,
    },
  ],
  settings: {
    'Timer default': '300 sec',
    'Cue mode': 'start-end',
    Theme: 'dark',
    'Font scale': 'standard',
  },
  myDocuments: [
    {
      title: 'My custom text',
      slug: 'my-custom-text',
      summary: 'A custom doc.',
      author: 'Odin',
      tags: ['personal'],
      bodyMarkdown: 'Hello from the custom doc.',
      createdAt: '2026-06-18T00:00:00.000Z',
      updatedAt: '2026-06-18T00:00:00.000Z',
    },
  ],
};

describe('createExportFilename', () => {
  it('includes date in filename', () => {
    const name = createExportFilename();
    expect(name).toMatch(/^totjo-holocron-export-\d{4}-\d{2}-\d{2}\.md$/);
  });
});

describe('formatUserDataMarkdown', () => {
  it('includes notes section', () => {
    const output = formatUserDataMarkdown(FULL_EXPORT);
    expect(output).toContain('## Notes');
    expect(output).toContain('Jedi Believe');
    expect(output).toContain('My personal note content.');
  });

  it('includes bookmarks section', () => {
    const output = formatUserDataMarkdown(FULL_EXPORT);
    expect(output).toContain('## Bookmarks');
    expect(output).toContain('The Code');
    expect(output).toContain('/library/doctrine/code');
  });

  it('includes practice history section', () => {
    const output = formatUserDataMarkdown(FULL_EXPORT);
    expect(output).toContain('## Practice History');
    expect(output).toContain('meditation');
    expect(output).toContain('300 sec');
  });

  it('includes settings section', () => {
    const output = formatUserDataMarkdown(FULL_EXPORT);
    expect(output).toContain('## Settings');
    expect(output).toContain('Timer default: 300 sec');
    expect(output).toContain('Theme: dark');
  });

  it('includes custom documents section', () => {
    const output = formatUserDataMarkdown(FULL_EXPORT);
    expect(output).toContain('## My Documents');
    expect(output).toContain('Hello from the custom doc.');
    expect(output).toContain('Slug: my-custom-text');
  });

  it('handles empty export gracefully', () => {
    const output = formatUserDataMarkdown(EMPTY_EXPORT);
    expect(output).toContain('No notes yet.');
    expect(output).toContain('No bookmarks yet.');
    expect(output).toContain('No practice history yet.');
    expect(output).toContain('No custom documents.');
  });

  it('produces valid markdown headings', () => {
    const output = formatUserDataMarkdown(FULL_EXPORT);
    expect(output).toContain('# TOTJO Holocron Export');
    expect(output).toContain('Exported:');
    expect(output).toContain('App version:');
  });

  it('escapes pipe characters in table content', () => {
    const exportWithPipe: ExportData = {
      ...FULL_EXPORT,
      practiceHistory: [
        { completedAt: '2026-06-22T00:00:00.000Z', practiceKind: 'reading | reflection', durationSeconds: 120 },
      ],
    };
    const output = formatUserDataMarkdown(exportWithPipe);
    expect(output).toContain('reading \\| reflection');
  });
});
