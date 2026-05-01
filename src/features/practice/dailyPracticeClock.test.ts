import { describe, expect, it } from 'vitest';

import {
  formatDailyPracticeClockInputValue,
  normalizeDailyPracticeClockOverride,
  resolveDailyPracticeNow,
  resolveDailyPracticeTimeZone,
} from './dailyPracticeClock';

describe('dailyPracticeClock', () => {
  it('falls back to the device clock when the override is disabled or invalid', () => {
    const fallbackNow = new Date('2026-04-26T09:00:00-05:00');

    expect(resolveDailyPracticeNow(fallbackNow, { enabled: false, localDateTime: '2026-04-27T00:05', timeZone: 'America/Chicago' })).toEqual(
      fallbackNow,
    );
    expect(resolveDailyPracticeNow(fallbackNow, { enabled: true, localDateTime: 'not-a-date', timeZone: 'America/Chicago' })).toEqual(
      fallbackNow,
    );
  });

  it('uses the saved local datetime when the override is enabled', () => {
    const resolvedNow = resolveDailyPracticeNow(new Date('2026-04-26T09:00:00-05:00'), {
      enabled: true,
      localDateTime: '2026-04-27T00:05',
      timeZone: 'America/Chicago',
    });

    expect(resolvedNow.toISOString()).toBe('2026-04-27T05:05:00.000Z');
  });

  it('normalizes malformed saved values', () => {
    expect(normalizeDailyPracticeClockOverride({ enabled: 'yes', localDateTime: 42, timeZone: 99 })).toEqual({
      enabled: false,
      localDateTime: '',
      timeZone: '',
    });
  });

  it('uses the saved time zone when the override is enabled', () => {
    expect(resolveDailyPracticeTimeZone('UTC', { enabled: true, localDateTime: '2026-04-27T00:05', timeZone: 'America/Chicago' })).toBe(
      'America/Chicago',
    );
    expect(resolveDailyPracticeTimeZone('UTC', { enabled: true, localDateTime: '2026-04-27T00:05', timeZone: '' })).toBe('UTC');
    expect(resolveDailyPracticeTimeZone('UTC', { enabled: false, localDateTime: '2026-04-27T00:05', timeZone: 'America/Chicago' })).toBe(
      'UTC',
    );
  });
});
