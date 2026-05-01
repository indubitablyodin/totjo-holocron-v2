import curatedManifestSource from '../../../content/supplemental/daily-practice/curated-manifest.json';

import { getLibraryDocumentHref } from '@/features/library/libraryPresentation';
import { bundledDocuments, type DocumentRecord } from '@/lib/content';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type DailyPracticeSourceKind = 'doctrine-passage' | 'supplemental-text' | 'sermon-reference';

type DailyPracticeManifestSourceEntry = {
  id: string;
  sourceKind: DailyPracticeSourceKind;
  documentSlug: string;
  title: string;
  summary: string;
  reflectionPrompt: string;
  sourceActionLabel: string;
};

type DailyPracticeManifestSource = {
  version: number;
  anchorDate: string;
  entries: DailyPracticeManifestSourceEntry[];
};

export type DailyPracticeManifestEntry = DailyPracticeManifestSourceEntry & {
  document: DocumentRecord;
  sourceHref: string;
};

export function getDailyPracticeSourceLabel(sourceKind: DailyPracticeSourceKind): string {
  if (sourceKind === 'supplemental-text') {
    return 'Supplemental text';
  }

  if (sourceKind === 'sermon-reference') {
    return 'Sermon reference';
  }

  return 'Doctrine reading';
}

export type DailyPracticeSelection = DailyPracticeManifestEntry & {
  manifestVersion: number;
  practiceDayKey: string;
  practiceDayId: string;
  entryIndex: number;
  timeZone: string;
  dateLabel: string;
  rolloverLabel: string;
};

type CalendarDay = {
  year: number;
  month: number;
  day: number;
  key: string;
};

const curatedManifest = curatedManifestSource as DailyPracticeManifestSource;

function padDayPart(value: number): string {
  return value.toString().padStart(2, '0');
}

function createCalendarDayKey(year: number, month: number, day: number): string {
  return `${year}-${padDayPart(month)}-${padDayPart(day)}`;
}

function parseAnchorDate(anchorDate: string): CalendarDay {
  const match = anchorDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(`Daily practice anchor date must use YYYY-MM-DD, received: ${anchorDate}`);
  }

  const [, year, month, day] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    key: anchorDate,
  };
}

function createCalendarDay(year: number, month: number, day: number): CalendarDay {
  return {
    year,
    month,
    day,
    key: createCalendarDayKey(year, month, day),
  };
}

export function parseDailyPracticeLocalDateTime(localDateTime: string): CalendarDay | null {
  const match = localDateTime.match(/^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2})?$/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return createCalendarDay(Number(year), Number(month), Number(day));
}

function getCalendarDay(date: Date, timeZone: string): CalendarDay {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type: 'year' | 'month' | 'day') => {
    const part = parts.find((entry) => entry.type === type)?.value;

    if (!part) {
      throw new Error(`Missing ${type} while formatting daily practice date for ${timeZone}`);
    }

    return Number(part);
  };

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');

  return {
    year,
    month,
    day,
    key: createCalendarDayKey(year, month, day),
  };
}

function getCalendarDayOffset(anchorDay: CalendarDay, targetDay: CalendarDay): number {
  const anchorUtc = Date.UTC(anchorDay.year, anchorDay.month - 1, anchorDay.day);
  const targetUtc = Date.UTC(targetDay.year, targetDay.month - 1, targetDay.day);

  return Math.floor((targetUtc - anchorUtc) / DAY_IN_MILLISECONDS);
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function getSourceHref(document: DocumentRecord): string {
  if (document.authorityClass === 'canonical' || document.authorityClass === 'supplemental') {
    return getLibraryDocumentHref(document);
  }

  if (document.authorityClass === 'sermon') {
    return `/library/sermons/${document.slug}`;
  }

  throw new Error(`Unsupported daily practice authority class: ${document.authorityClass}`);
}

function validateManifestEntry(entry: DailyPracticeManifestSourceEntry): DailyPracticeManifestEntry {
  const document = bundledDocuments.find((candidate) => candidate.slug === entry.documentSlug);

  if (!document) {
    throw new Error(`Daily practice entry ${entry.id} references unknown document slug: ${entry.documentSlug}`);
  }

  if (document.source.approvalStatus !== 'approved' || document.source.provenanceStatus !== 'recorded') {
    throw new Error(
      `Daily practice entry ${entry.id} must reference bundled content with recorded provenance and ready review status. ${entry.documentSlug} is ${document.source.approvalStatus}/${document.source.provenanceStatus}.`,
    );
  }

  if (entry.sourceKind === 'doctrine-passage' && document.authorityClass !== 'canonical') {
    throw new Error(`Daily doctrine entry ${entry.id} must reference a doctrine text.`);
  }

  if (entry.sourceKind === 'supplemental-text' && document.authorityClass !== 'supplemental') {
    throw new Error(`Daily supplemental entry ${entry.id} must reference supplemental reading.`);
  }

  if (entry.sourceKind === 'sermon-reference' && document.authorityClass !== 'sermon') {
    throw new Error(`Daily sermon entry ${entry.id} must reference a sermon record.`);
  }

  return {
    ...entry,
    document,
    sourceHref: getSourceHref(document),
  };
}

const anchorDay = parseAnchorDate(curatedManifest.anchorDate);

export const dailyPracticeManifest = {
  version: curatedManifest.version,
  anchorDate: anchorDay.key,
  entries: curatedManifest.entries.map((entry) => validateManifestEntry(entry)),
};

export function getResolvedDailyPracticeTimeZone(): string {
  const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return resolvedTimeZone && resolvedTimeZone.length > 0 ? resolvedTimeZone : 'UTC';
}

export function getDailyPracticeDayKey(date: Date, timeZone: string): string {
  return getCalendarDay(date, timeZone).key;
}

export function createDailyPracticeDayId(dayKey: string, timeZone: string): string {
  return `${timeZone}:${dayKey}`;
}

export function formatDailyPracticeDateLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatDailyPracticeCalendarDayLabel(calendarDay: CalendarDay): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(Date.UTC(calendarDay.year, calendarDay.month - 1, calendarDay.day, 12)));
}

export function getDailyPracticeRolloverLabel(timeZone: string): string {
  return `Rolls over at 12:00 AM in ${timeZone}.`;
}

function selectDailyPracticeForCalendarDay(practiceDay: CalendarDay, timeZone: string, dateLabel: string): DailyPracticeSelection {
  const entryIndex = modulo(getCalendarDayOffset(anchorDay, practiceDay), dailyPracticeManifest.entries.length);
  const entry = dailyPracticeManifest.entries[entryIndex];

  return {
    ...entry,
    manifestVersion: dailyPracticeManifest.version,
    practiceDayKey: practiceDay.key,
    practiceDayId: createDailyPracticeDayId(practiceDay.key, timeZone),
    entryIndex,
    timeZone,
    dateLabel,
    rolloverLabel: getDailyPracticeRolloverLabel(timeZone),
  };
}

export function selectDailyPractice(date: Date, timeZone = getResolvedDailyPracticeTimeZone()): DailyPracticeSelection {
  const practiceDay = getCalendarDay(date, timeZone);

  return selectDailyPracticeForCalendarDay(practiceDay, timeZone, formatDailyPracticeDateLabel(date, timeZone));
}

export function selectDailyPracticeFromLocalDateTime(localDateTime: string, timeZone: string): DailyPracticeSelection | null {
  const practiceDay = parseDailyPracticeLocalDateTime(localDateTime);

  if (!practiceDay) {
    return null;
  }

  return selectDailyPracticeForCalendarDay(practiceDay, timeZone, formatDailyPracticeCalendarDayLabel(practiceDay));
}
