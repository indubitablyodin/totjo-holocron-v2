import { describe, expect, it } from 'vitest';

import { getBackupFreshnessStatus } from './backupFreshness';

describe('getBackupFreshnessStatus', () => {
  it('returns none-needed when no user data', () => {
    expect(getBackupFreshnessStatus(null, new Date(), false)).toBe('none-needed');
  });

  it('returns never-backed-up when user data exists and no record', () => {
    expect(getBackupFreshnessStatus(null, new Date(), true)).toBe('never-backed-up');
  });

  it('returns fresh for export within 30 days', () => {
    const lastExport = { lastExportedAt: '2026-06-20T00:00:00.000Z', lastExportKind: 'markdown' as const };
    expect(getBackupFreshnessStatus(lastExport, new Date('2026-06-24T12:00:00.000Z'), true)).toBe('fresh');
  });

  it('returns stale for export older than 30 days', () => {
    const lastExport = { lastExportedAt: '2026-05-01T00:00:00.000Z', lastExportKind: 'markdown' as const };
    expect(getBackupFreshnessStatus(lastExport, new Date('2026-06-24T12:00:00.000Z'), true)).toBe('stale');
  });

  it('returns unknown for invalid date', () => {
    const lastExport = { lastExportedAt: 'not-a-date', lastExportKind: 'markdown' as const };
    expect(getBackupFreshnessStatus(lastExport, new Date(), true)).toBe('unknown');
  });

  it('returns unknown for future date', () => {
    const lastExport = { lastExportedAt: '2027-01-01T00:00:00.000Z', lastExportKind: 'markdown' as const };
    expect(getBackupFreshnessStatus(lastExport, new Date('2026-06-24T12:00:00.000Z'), true)).toBe('unknown');
  });
});
