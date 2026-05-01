import { afterEach, describe, expect, it, vi } from 'vitest';

import { API_SYNC_PROFILE_PATH, createApiSyncRemoteClient } from './client';
import { getSyncRemoteMode } from './config';
import { createEmptyUserSyncProfile } from './merge';

describe('sync remote mode config', () => {
  it('defaults to Supabase when no sync remote mode is configured', () => {
    expect(getSyncRemoteMode({} as ImportMetaEnv)).toBe('supabase');
  });

  it('selects the API proxy only when explicitly configured', () => {
    expect(getSyncRemoteMode({ VITE_SYNC_REMOTE_MODE: 'api' } as ImportMetaEnv)).toBe('api');
    expect(getSyncRemoteMode({ VITE_SYNC_REMOTE_MODE: 'supabase' } as ImportMetaEnv)).toBe('supabase');
  });
});

describe('API sync remote client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads through the same-origin endpoint with a Supabase bearer token only', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ profile: null }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiSyncRemoteClient(async () => 'supabase-access-token');

    await expect(client.loadProfile('user-id-from-caller')).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledWith(API_SYNC_PROFILE_PATH, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer supabase-access-token',
      },
    });
    expect(JSON.stringify(fetchMock.mock.calls[0])).not.toContain('user-id-from-caller');
  });

  it('saves the profile without sending the caller user id as authority', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ saved: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const profile = createEmptyUserSyncProfile('2026-04-30T00:00:00.000Z');

    await createApiSyncRemoteClient(async () => 'supabase-access-token').saveProfile('user-id-from-caller', profile);

    expect(fetchMock).toHaveBeenCalledWith(API_SYNC_PROFILE_PATH, {
      method: 'PUT',
      headers: {
        authorization: 'Bearer supabase-access-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    });
    expect(JSON.stringify(fetchMock.mock.calls[0])).not.toContain('user-id-from-caller');
  });

  it('fails before calling the endpoint when no Supabase access token is available', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(createApiSyncRemoteClient(async () => '').loadProfile('user-id-from-caller')).rejects.toThrow(
      'API sync requires an active Supabase session',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
