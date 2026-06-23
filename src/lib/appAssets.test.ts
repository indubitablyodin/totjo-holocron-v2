import { describe, expect, it } from 'vitest';

import { getAppAssetPath } from './appAssets';

describe('getAppAssetPath', () => {
  it('prefixes a root-relative path with the base URL in test environment', () => {
    expect(getAppAssetPath('/audio/default-gong-start.mp3')).toBe('/audio/default-gong-start.mp3');
  });

  it('accepts a path without a leading slash', () => {
    expect(getAppAssetPath('audio/default-gong-start.mp3')).toBe('/audio/default-gong-start.mp3');
  });

  it('handles a non-root base URL', () => {
    const originalBase = import.meta.env.BASE_URL;

    const env = import.meta.env;
    (env as Record<string, string>).BASE_URL = '/totjo-holocron-v2/';
    expect(getAppAssetPath('audio/default-gong-start.mp3')).toBe('/totjo-holocron-v2/audio/default-gong-start.mp3');

    (env as Record<string, string>).BASE_URL = originalBase;
  });

  it('handles a base URL without a trailing slash', () => {
    const originalBase = import.meta.env.BASE_URL;

    const env = import.meta.env;
    (env as Record<string, string>).BASE_URL = '/totjo-holocron-v2';
    expect(getAppAssetPath('audio/default-gong-start.mp3')).toBe('/totjo-holocron-v2/audio/default-gong-start.mp3');

    (env as Record<string, string>).BASE_URL = originalBase;
  });
});
