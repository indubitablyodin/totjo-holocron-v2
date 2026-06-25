import { describe, expect, it } from 'vitest';

import { formatBytes, isStorageManagerSupported } from './storageHealth';

describe('storageHealth', () => {
  it('isStorageManagerSupported returns false in test environment', () => {
    expect(isStorageManagerSupported()).toBe(false);
  });

  it('formatBytes handles bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formatBytes handles KB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formatBytes handles MB', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
