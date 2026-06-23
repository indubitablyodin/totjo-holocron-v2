import { describe, expect, it } from 'vitest';

import { firstNonEmpty, resolveThreeTenetsItems } from './contentRegistry';
import { nonEmptyArray } from './contentTypes';

describe('nonEmptyArray', () => {
  it('returns true for a non-empty array', () => {
    expect(nonEmptyArray(['a', 'b'])).toBe(true);
  });

  it('returns false for an empty array', () => {
    expect(nonEmptyArray([])).toBe(false);
  });

  it('returns false for null', () => {
    expect(nonEmptyArray(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(nonEmptyArray(undefined)).toBe(false);
  });
});

describe('firstNonEmpty', () => {
  it('returns the first array when it has items', () => {
    expect(firstNonEmpty(['a'], ['b'], [])).toEqual(['a']);
  });

  it('skips empty arrays and returns the first non-empty one', () => {
    expect(firstNonEmpty([], ['b'], ['c'])).toEqual(['b']);
  });

  it('returns empty array when all candidates are empty or missing', () => {
    expect(firstNonEmpty([], null, undefined)).toEqual([]);
  });
});

describe('resolveThreeTenetsItems', () => {
  it('returns section body text when sections are present and non-empty', () => {
    const sections = [
      { title: 'Focus', body: ['Focus is the art of pruning the irrelevant.'] },
      { title: 'Knowledge', body: ['Knowledge can be acquired by focusing.'] },
      { title: 'Wisdom', body: ['Wisdom is the sound application of accrued knowledge.'] },
    ];
    const result = resolveThreeTenetsItems(sections, ['Focus', 'Knowledge', 'Wisdom'], []);

    expect(result).toEqual([
      'Focus is the art of pruning the irrelevant.',
      'Knowledge can be acquired by focusing.',
      'Wisdom is the sound application of accrued knowledge.',
    ]);
  });

  it('falls back to tenets when sections is empty', () => {
    const result = resolveThreeTenetsItems([], ['Focus', 'Knowledge', 'Wisdom'], []);
    expect(result).toEqual(['Focus', 'Knowledge', 'Wisdom']);
  });

  it('falls back to tenets when sections is null', () => {
    const result = resolveThreeTenetsItems(null, ['Focus', 'Knowledge', 'Wisdom'], undefined);
    expect(result).toEqual(['Focus', 'Knowledge', 'Wisdom']);
  });

  it('falls back to tenets when sections is undefined', () => {
    const result = resolveThreeTenetsItems(undefined, ['Focus', 'Knowledge', 'Wisdom'], undefined);
    expect(result).toEqual(['Focus', 'Knowledge', 'Wisdom']);
  });

  it('falls back to items when both sections and tenets are empty', () => {
    const result = resolveThreeTenetsItems([], [], ['item-a', 'item-b']);
    expect(result).toEqual(['item-a', 'item-b']);
  });

  it('falls back to items when tenets is present but empty', () => {
    const result = resolveThreeTenetsItems(null, [], ['item-a']);
    expect(result).toEqual(['item-a']);
  });

  it('returns empty array when nothing is available', () => {
    const result = resolveThreeTenetsItems(null, null, null);
    expect(result).toEqual([]);
  });

  it('returns section title when body array is empty', () => {
    const sections = [
      { title: 'Focus', body: [] },
    ];
    const result = resolveThreeTenetsItems(sections, ['Focus'], []);
    expect(result).toEqual(['Focus']);
  });
});
