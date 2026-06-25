import { describe, expect, it } from 'vitest';

import { validateFeedUrl, validateRuntimeConfig, resolveAnnouncementsFeedUrl } from './runtimeConfig';

describe('validateFeedUrl', () => {
  it('accepts same-origin path', () => {
    expect(validateFeedUrl('/announcements.json')).toBe(true);
  });

  it('accepts https URL', () => {
    expect(validateFeedUrl('https://example.com/feed.json')).toBe(true);
  });

  it('rejects http URL', () => {
    expect(validateFeedUrl('http://example.com/feed.json')).toBe(false);
  });

  it('rejects javascript: URL', () => {
    expect(validateFeedUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URL', () => {
    expect(validateFeedUrl('data:text/json,...')).toBe(false);
  });
});

describe('validateRuntimeConfig', () => {
  it('accepts valid config', () => {
    const config = validateRuntimeConfig({
      schemaVersion: 1,
      announcementsFeedUrl: 'https://example.com/feed.json',
    });
    expect(config).not.toBeNull();
    expect(config?.announcementsFeedUrl).toBe('https://example.com/feed.json');
  });

  it('rejects wrong schemaVersion', () => {
    expect(validateRuntimeConfig({ schemaVersion: 2 })).toBeNull();
  });

  it('rejects non-object', () => {
    expect(validateRuntimeConfig(null)).toBeNull();
  });

  it('rejects unsafe feed URL', () => {
    const config = validateRuntimeConfig({
      schemaVersion: 1,
      announcementsFeedUrl: 'http://example.com/feed.json',
    });
    expect(config?.announcementsFeedUrl).toBeUndefined();
  });
});

describe('resolveAnnouncementsFeedUrl', () => {
  it('uses runtime config when available', () => {
    const resolved = resolveAnnouncementsFeedUrl({
      schemaVersion: 1,
      announcementsFeedUrl: 'https://cdn.example.com/feed.json',
    });
    expect(resolved.url).toBe('https://cdn.example.com/feed.json');
    expect(resolved.source).toBe('runtime-config');
  });

  it('falls back to default when no runtime config', () => {
    const resolved = resolveAnnouncementsFeedUrl(null);
    expect(resolved.url).toBe('/announcements.json');
    expect(resolved.source).toBe('default');
  });
});
