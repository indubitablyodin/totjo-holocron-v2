import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

import { describe, expect, it } from 'vitest';

function runImporter(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/import-totjo/import-sermons.mjs', ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

describe('sermon-import importer', () => {
  it('normalizes archive and detail fixtures into local sermon assets', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'totjo-sermons-import-'));

    const result = await runImporter([
      '--archive-file',
      'tests/fixtures/totjo-sermons/archive-page-1.html',
      '--detail-dir',
      'tests/fixtures/totjo-sermons/details',
      '--output-dir',
      outputDir,
      '--imported-at',
      '2026-04-27T00:00:00.000Z',
    ]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');

    const index = JSON.parse(await readFile(path.join(outputDir, 'index.json'), 'utf8'));
    const detail = JSON.parse(await readFile(path.join(outputDir, 'the-force-works-all-things-out.json'), 'utf8'));

    expect(index.documents).toHaveLength(3);
    expect(index.documents[0]).toMatchObject({
      slug: 'sermon-from-the-stove-boiling-water',
      authorityClass: 'sermon',
      documentType: 'sermon',
      bodyMarkdown: '',
      sourceUrl: 'https://templeofthejediorder.org/sermons/sermon-from-the-stove-boiling-water',
      author: 'ChaotishRabe',
    });
    expect(index.checksum).toMatch(/^fnv1a-/);
    expect(detail.document).toMatchObject({
      slug: 'the-force-works-all-things-out',
      authorityClass: 'sermon',
      documentType: 'sermon',
      author: 'Rosalyn Johnson',
      sourceUrl: 'https://templeofthejediorder.org/sermons/the-force-works-all-things-out',
    });
    expect(detail.document.bodyMarkdown).toContain('Before I begin');
    expect(detail.document.bodyMarkdown).toContain('I don’t pretend to know what Yoda was doing for all those years on Dagobah.');
    expect(detail.document.bodyMarkdown).toContain('Our statement of faith begins with “Jedi believe in the Force…”.');
    expect(detail.document.bodyMarkdown).toContain('We are instruments of peace (Meditation for Jedi)');
    expect(detail.document.checksum).toMatch(/^fnv1a-/);
  });

  it('fails clearly when the TOTJO source shape drifts', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'totjo-sermons-import-error-'));

    const result = await runImporter([
      '--archive-file',
      'tests/fixtures/totjo-sermons/archive-broken.html',
      '--detail-dir',
      'tests/fixtures/totjo-sermons/details',
      '--output-dir',
      outputDir,
      '--imported-at',
      '2026-04-27T00:00:00.000Z',
    ]);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('TOTJO parser error');
    expect(result.stderr).toContain('missing selector h1[itemprop="headline"]');
  });
});
