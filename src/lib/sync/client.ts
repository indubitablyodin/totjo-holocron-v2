import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getAuthMode } from '@/lib/supabase/config';

import { getSyncRemoteMode } from './config';
import { createEmptyUserSyncProfile } from './merge';
import type { UserSyncProfile } from './types';

export type SyncRemoteClient = {
  loadProfile: (userId: string) => Promise<UserSyncProfile | null>;
  saveProfile: (userId: string, profile: UserSyncProfile) => Promise<void>;
};

type SupabaseSettingsRow = {
  user_id: string;
  reading_settings: UserSyncProfile['settings']['readingSettings'];
  timer_preferences: UserSyncProfile['settings']['timerPreferences'];
  updated_at: string;
};

const TEST_SYNC_API_PATH = '/api/test-sync/profile';
const TEST_SYNC_MEMORY_KEY = '__TOTJO_HOLOCRON_SYNC_TEST_REMOTE__';
export const API_SYNC_PROFILE_PATH = '/api/sync/profile';

function getTestMemoryStore(): Map<string, UserSyncProfile> {
  const scopedGlobal = globalThis as typeof globalThis & {
    [TEST_SYNC_MEMORY_KEY]?: Map<string, UserSyncProfile>;
  };

  scopedGlobal[TEST_SYNC_MEMORY_KEY] ??= new Map<string, UserSyncProfile>();
  return scopedGlobal[TEST_SYNC_MEMORY_KEY];
}

function createInMemoryTestClient(): SyncRemoteClient {
  return {
    async loadProfile(userId) {
      return getTestMemoryStore().get(userId) ?? null;
    },
    async saveProfile(userId, profile) {
      getTestMemoryStore().set(userId, profile);
    },
  };
}

function createFetchTestClient(): SyncRemoteClient {
  return {
    async loadProfile(userId) {
      const response = await fetch(`${TEST_SYNC_API_PATH}?userId=${encodeURIComponent(userId)}`);

      if (!response.ok) {
        throw new Error(`Unable to load sync profile (${response.status}).`);
      }

      const payload = (await response.json()) as { profile: UserSyncProfile | null };
      return payload.profile;
    },
    async saveProfile(userId, profile) {
      const response = await fetch(TEST_SYNC_API_PATH, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId, profile }),
      });

      if (!response.ok) {
        throw new Error(`Unable to save sync profile (${response.status}).`);
      }
    },
  };
}

async function getSupabaseAccessToken(): Promise<string> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error('API sync requires Supabase auth configuration.');
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('API sync requires an active Supabase session before contacting /api/sync/profile.');
  }

  return accessToken;
}

export function createApiSyncRemoteClient(accessTokenProvider = getSupabaseAccessToken): SyncRemoteClient {
  async function getAuthorizationHeader() {
    const accessToken = await accessTokenProvider();

    if (!accessToken) {
      throw new Error('API sync requires an active Supabase session before contacting /api/sync/profile.');
    }

    return `Bearer ${accessToken}`;
  }

  return {
    async loadProfile() {
      const response = await fetch(API_SYNC_PROFILE_PATH, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: await getAuthorizationHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Unable to load sync profile (${response.status}).`);
      }

      const payload = (await response.json()) as { profile: UserSyncProfile | null };
      return payload.profile;
    },
    async saveProfile(_userId, profile) {
      const response = await fetch(API_SYNC_PROFILE_PATH, {
        method: 'PUT',
        headers: {
          authorization: await getAuthorizationHeader(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        throw new Error(`Unable to save sync profile (${response.status}).`);
      }
    },
  };
}

function mapSupabaseSettingsRow(row: SupabaseSettingsRow | null | undefined): UserSyncProfile['settings'] {
  const emptyProfile = createEmptyUserSyncProfile();

  return {
    readingSettings: row?.reading_settings ?? emptyProfile.settings.readingSettings,
    timerPreferences: row?.timer_preferences ?? emptyProfile.settings.timerPreferences,
    updatedAt: row?.updated_at ?? emptyProfile.settings.updatedAt,
  };
}

function createSupabaseClient(): SyncRemoteClient {
  return {
    async loadProfile(userId) {
      const client = getSupabaseBrowserClient();

      if (!client) {
        return null;
      }

      const [progressResult, bookmarksResult, notesResult, practiceHistoryResult, downloadsResult, personalizationRulesResult, settingsResult] =
        await Promise.all([
          client.from('user_progress').select('id, document_id, progress_percent, last_anchor, updated_at').eq('user_id', userId),
          client.from('user_bookmarks').select('id, document_id, anchor, label, created_at, updated_at').eq('user_id', userId),
          client.from('user_notes').select('id, document_id, anchor, body_markdown, created_at, updated_at').eq('user_id', userId),
          client
            .from('user_practice_history')
            .select('id, document_id, practice_kind, completed_at, duration_seconds')
            .eq('user_id', userId),
          client.from('user_downloads').select('id, document_id, status, stored_checksum, updated_at').eq('user_id', userId),
          client
            .from('user_personalization_rules')
            .select('id, scope, document_id, token, replacement, enabled, updated_at')
            .eq('user_id', userId),
          client
            .from('user_settings')
            .select('user_id, reading_settings, timer_preferences, updated_at')
            .eq('user_id', userId)
            .maybeSingle(),
        ]);

      const errors = [
        progressResult.error,
        bookmarksResult.error,
        notesResult.error,
        practiceHistoryResult.error,
        downloadsResult.error,
        personalizationRulesResult.error,
        settingsResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw errors[0];
      }

      return {
        meta: {
          schemaVersion: 1,
          firstUpgradeCompletedAt: progressResult.data?.length || bookmarksResult.data?.length || notesResult.data?.length || practiceHistoryResult.data?.length || downloadsResult.data?.length || personalizationRulesResult.data?.length || settingsResult.data ? 'existing-remote-profile' : null,
          lastMergedAt: null,
        },
        progress:
          progressResult.data?.map((record) => ({
            id: record.id,
            documentId: record.document_id,
            progressPercent: Number(record.progress_percent),
            lastAnchor: record.last_anchor,
            updatedAt: record.updated_at,
          })) ?? [],
        bookmarks:
          bookmarksResult.data?.map((record) => ({
            id: record.id,
            documentId: record.document_id,
            anchor: record.anchor,
            label: record.label,
            createdAt: record.created_at,
            updatedAt: record.updated_at,
          })) ?? [],
        notes:
          notesResult.data?.map((record) => ({
            id: record.id,
            documentId: record.document_id,
            anchor: record.anchor,
            bodyMarkdown: record.body_markdown,
            createdAt: record.created_at,
            updatedAt: record.updated_at,
          })) ?? [],
        practiceHistory:
          practiceHistoryResult.data?.map((record) => ({
            id: record.id,
            documentId: record.document_id,
            practiceKind: record.practice_kind,
            completedAt: record.completed_at,
            durationSeconds: record.duration_seconds,
          })) ?? [],
        downloads:
          downloadsResult.data?.map((record) => ({
            id: record.id,
            documentId: record.document_id,
            status: record.status,
            storedChecksum: record.stored_checksum,
            updatedAt: record.updated_at,
          })) ?? [],
        personalizationRules:
          personalizationRulesResult.data?.map((record) => ({
            id: record.id,
            scope: record.scope,
            documentId: record.document_id,
            token: record.token,
            replacement: record.replacement,
            enabled: record.enabled,
            updatedAt: record.updated_at,
          })) ?? [],
        settings: mapSupabaseSettingsRow(settingsResult.data as SupabaseSettingsRow | null | undefined),
      };
    },
    async saveProfile(userId, profile) {
      const client = getSupabaseBrowserClient();

      if (!client) {
        return;
      }

      const [progressResult, bookmarksResult, notesResult, practiceHistoryResult, downloadsResult, personalizationRulesResult, settingsResult] =
        await Promise.all([
          profile.progress.length > 0
            ? client.from('user_progress').upsert(
                profile.progress.map((record) => ({
                  id: record.id,
                  user_id: userId,
                  document_id: record.documentId,
                  progress_percent: record.progressPercent,
                  last_anchor: record.lastAnchor,
                  updated_at: record.updatedAt,
                })),
              )
            : Promise.resolve({ error: null }),
          profile.bookmarks.length > 0
            ? client.from('user_bookmarks').upsert(
                profile.bookmarks.map((record) => ({
                  id: record.id,
                  user_id: userId,
                  document_id: record.documentId,
                  anchor: record.anchor,
                  label: record.label,
                  created_at: record.createdAt,
                  updated_at: record.updatedAt,
                })),
              )
            : Promise.resolve({ error: null }),
          profile.notes.length > 0
            ? client.from('user_notes').upsert(
                profile.notes.map((record) => ({
                  id: record.id,
                  user_id: userId,
                  document_id: record.documentId,
                  anchor: record.anchor,
                  body_markdown: record.bodyMarkdown,
                  created_at: record.createdAt,
                  updated_at: record.updatedAt,
                })),
              )
            : Promise.resolve({ error: null }),
          profile.practiceHistory.length > 0
            ? client.from('user_practice_history').upsert(
                profile.practiceHistory.map((record) => ({
                  id: record.id,
                  user_id: userId,
                  document_id: record.documentId,
                  practice_kind: record.practiceKind,
                  completed_at: record.completedAt,
                  duration_seconds: record.durationSeconds,
                })),
              )
            : Promise.resolve({ error: null }),
          profile.downloads.length > 0
            ? client.from('user_downloads').upsert(
                profile.downloads.map((record) => ({
                  id: record.id,
                  user_id: userId,
                  document_id: record.documentId,
                  status: record.status,
                  stored_checksum: record.storedChecksum,
                  updated_at: record.updatedAt,
                })),
              )
            : Promise.resolve({ error: null }),
          profile.personalizationRules.length > 0
            ? client.from('user_personalization_rules').upsert(
                profile.personalizationRules.map((record) => ({
                  id: record.id,
                  user_id: userId,
                  scope: record.scope,
                  document_id: record.documentId,
                  token: record.token,
                  replacement: record.replacement,
                  enabled: record.enabled,
                  updated_at: record.updatedAt,
                })),
              )
            : Promise.resolve({ error: null }),
          client.from('user_settings').upsert({
            user_id: userId,
            reading_settings: profile.settings.readingSettings,
            timer_preferences: profile.settings.timerPreferences,
            updated_at: profile.settings.updatedAt,
          }),
        ]);

      const errors = [
        progressResult.error,
        bookmarksResult.error,
        notesResult.error,
        practiceHistoryResult.error,
        downloadsResult.error,
        personalizationRulesResult.error,
        settingsResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw errors[0];
      }
    },
  };
}

export function createSyncRemoteClient(env: ImportMetaEnv = import.meta.env): SyncRemoteClient {
  if (getAuthMode(env) === 'test') {
    return import.meta.env.MODE === 'test' ? createInMemoryTestClient() : createFetchTestClient();
  }

  return getSyncRemoteMode(env) === 'api' ? createApiSyncRemoteClient() : createSupabaseClient();
}

export async function clearTestSyncRemoteProfile(userId: string) {
  if (import.meta.env.MODE === 'test') {
    getTestMemoryStore().delete(userId);
    return;
  }

  await fetch(`${TEST_SYNC_API_PATH}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}
