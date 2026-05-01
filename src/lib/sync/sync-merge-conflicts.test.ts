import { describe, expect, it } from 'vitest';

import { createEmptyUserSyncProfile, mergeUserSyncProfiles } from '@/lib/sync';

describe('sync merge-conflicts', () => {
  it('uses latest-updatedAt for notes while bookmark unions stay deduplicated', () => {
    const local = createEmptyUserSyncProfile('2026-04-27T10:00:00.000Z');
    const remote = createEmptyUserSyncProfile('2026-04-27T09:00:00.000Z');

    local.bookmarks = [
      {
        id: 'bookmark-local',
        documentId: 'doc-1',
        anchor: 'opening',
        label: 'Opening section',
        createdAt: '2026-04-27T08:00:00.000Z',
        updatedAt: '2026-04-27T08:00:00.000Z',
      },
    ];
    remote.bookmarks = [
      {
        id: 'bookmark-remote',
        documentId: 'doc-1',
        anchor: 'opening',
        label: 'Opening section duplicate',
        createdAt: '2026-04-27T07:00:00.000Z',
        updatedAt: '2026-04-27T07:30:00.000Z',
      },
    ];
    local.notes = [
      {
        id: 'note-1',
        documentId: 'doc-1',
        anchor: 'opening',
        bodyMarkdown: 'Local note body wins',
        createdAt: '2026-04-27T08:00:00.000Z',
        updatedAt: '2026-04-27T10:00:00.000Z',
      },
    ];
    remote.notes = [
      {
        id: 'note-1',
        documentId: 'doc-1',
        anchor: 'opening',
        bodyMarkdown: 'Older remote note body',
        createdAt: '2026-04-27T08:00:00.000Z',
        updatedAt: '2026-04-27T09:00:00.000Z',
      },
    ];

    const merged = mergeUserSyncProfiles(local, remote, '2026-04-27T11:00:00.000Z');

    expect(merged.bookmarks).toHaveLength(1);
    expect(merged.bookmarks[0]).toMatchObject({
      id: 'bookmark-local',
      documentId: 'doc-1',
      anchor: 'opening',
    });
    expect(merged.notes).toHaveLength(1);
    expect(merged.notes[0]?.bodyMarkdown).toBe('Local note body wins');
  });

  it('prefers local settings on the first upgrade and latest-updatedAt afterward', () => {
    const local = createEmptyUserSyncProfile('2026-04-27T12:00:00.000Z');
    const firstUpgradeMerged = mergeUserSyncProfiles(local, null, '2026-04-27T12:30:00.000Z');

    expect(firstUpgradeMerged.settings).toEqual(local.settings);
    expect(firstUpgradeMerged.meta.firstUpgradeCompletedAt).toBe('2026-04-27T12:30:00.000Z');

    const newerRemote = {
      ...createEmptyUserSyncProfile('2026-04-27T13:30:00.000Z'),
      meta: {
        schemaVersion: 1 as const,
        firstUpgradeCompletedAt: '2026-04-27T12:30:00.000Z',
        lastMergedAt: '2026-04-27T12:30:00.000Z',
      },
      settings: {
        readingSettings: {
          fontScale: 'large' as const,
          theme: 'light' as const,
          contrast: 'high' as const,
        },
        timerPreferences: {
          defaultDurationSeconds: 300,
          defaultCueMode: 'end-only' as const,
          defaultIntervalSeconds: 0,
          defaultSoundProfileId: 'silent' as const,
          recordPracticeHistory: false,
        },
        updatedAt: '2026-04-27T13:30:00.000Z',
      },
    };

    const laterMerge = mergeUserSyncProfiles(local, newerRemote, '2026-04-27T14:00:00.000Z');

    expect(laterMerge.settings).toEqual(newerRemote.settings);
  });

  it('unions daily completions by practiceDate plus itemId and meditation rows by session id', () => {
    const local = createEmptyUserSyncProfile('2026-04-27T10:00:00.000Z');
    const remote = createEmptyUserSyncProfile('2026-04-27T10:00:00.000Z');

    local.practiceHistory = [
      {
        id: 'daily-practice:America/New_York:2026-04-27',
        documentId: 'doc-1',
        practiceKind: 'reading',
        completedAt: '2026-04-27T10:00:00.000Z',
        durationSeconds: 0,
      },
      {
        id: 'meditation:session-local',
        documentId: null,
        practiceKind: 'meditation',
        completedAt: '2026-04-27T11:00:00.000Z',
        durationSeconds: 300,
      },
    ];
    remote.practiceHistory = [
      {
        id: 'daily-practice:UTC:2026-04-27',
        documentId: 'doc-1',
        practiceKind: 'reading',
        completedAt: '2026-04-27T09:00:00.000Z',
        durationSeconds: 0,
      },
      {
        id: 'meditation:session-local',
        documentId: null,
        practiceKind: 'meditation',
        completedAt: '2026-04-27T11:00:00.000Z',
        durationSeconds: 300,
      },
      {
        id: 'meditation:session-remote',
        documentId: null,
        practiceKind: 'meditation',
        completedAt: '2026-04-27T12:00:00.000Z',
        durationSeconds: 600,
      },
    ];

    const merged = mergeUserSyncProfiles(local, remote, '2026-04-27T13:00:00.000Z');

    expect(merged.practiceHistory).toHaveLength(3);
    expect(merged.practiceHistory.filter((record) => record.id.startsWith('daily-practice:'))).toHaveLength(1);
    expect(merged.practiceHistory.filter((record) => record.practiceKind === 'meditation')).toHaveLength(2);
  });
});
