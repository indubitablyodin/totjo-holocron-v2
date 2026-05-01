import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SUPABASE_SYNC_TABLES } from '@/lib/supabase/syncBoundaries';

const projectRoot = process.cwd();
const supabaseConfigPath = path.join(projectRoot, 'supabase', 'config.toml');

function readCombinedMigrationSql() {
  const migrationDirectory = path.join(projectRoot, 'supabase', 'migrations');
  const migrationFiles = ['20260427000000_task_10_auth_boundaries.sql', '20260427110000_task_11_sync_practice_history.sql'];

  return migrationFiles.map((fileName) => readFileSync(path.join(migrationDirectory, fileName), 'utf8')).join('\n');
}

describe('rls sync boundaries', () => {
  it('defines the local Supabase project config expected by Task 10', () => {
    const config = readFileSync(supabaseConfigPath, 'utf8');

    expect(config).toContain('project_id = "totjo-holocron"');
    expect(config).toContain('[auth]');
    expect(config).toContain('/auth/callback');
  });

  it('limits remote schema tables to the user-owned sync boundary', () => {
    const migration = readCombinedMigrationSql();

    for (const tableName of SUPABASE_SYNC_TABLES) {
      expect(migration).toContain(`create table if not exists public.${tableName}`);
      expect(migration).toContain(`alter table public.${tableName} enable row level security`);
      expect(migration).toContain(`create policy "${tableName} owner access"`);
    }

    expect(migration).not.toContain('create table if not exists public.documents');
    expect(migration).not.toContain('create table if not exists public.canonical_documents');
    expect(migration).not.toContain('create table if not exists public.supplemental_documents');
    expect(migration).not.toContain('create table if not exists public.sermons');
  });

  it('uses auth.uid ownership checks for every row-level policy', () => {
    const migration = readCombinedMigrationSql();

    const ownerChecks = migration.match(/auth\.uid\(\) = user_id/g) ?? [];
    expect(ownerChecks.length).toBeGreaterThanOrEqual(SUPABASE_SYNC_TABLES.length * 2);
  });
});
