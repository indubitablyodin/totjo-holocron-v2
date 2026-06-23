import { doctrineDocuments } from '@/lib/content';
import { resolveThreeTenetsItems } from '@/content/contentRegistry';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DAILY_FOCUS_ANCHOR_DATE = '2026-04-26';
const JEDI_BELIEVE_PREFACE = 'Jediism is a religion based on the observance of the Force. We believe:';

type DailyFocusSourceKind = 'jedi-believe' | 'three-tenets' | 'sixteen-teachings' | 'twenty-one-maxims';

type DailyFocusSourceDocument = {
  slug: string;
  title: string;
  items?: string[];
  tenets?: string[];
  sections?: Array<{ title: string; body: string[] }>;
};

export type DailyFocusEntry = {
  id: string;
  sourceKind: DailyFocusSourceKind;
  sourceSlug: string;
  sourceTitle: string;
  sourceHref: string;
  sourceActionLabel: string;
  label: string;
  text: string;
  preface: string | null;
};

export type DailyFocusSelection = DailyFocusEntry & {
  dayKey: string;
  entryIndex: number;
  poolSize: number;
};

function euclideanModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function assertFocusDocument(slug: string): DailyFocusSourceDocument {
  const document = doctrineDocuments.find((candidate) => candidate.slug === slug);

  if (!document) {
    throw new Error(`Daily Focus source is missing structured doctrine document: ${slug}`);
  }

  return document;
}

function createFocusEntries(
  document: DailyFocusSourceDocument,
  sourceKind: DailyFocusSourceKind,
  items: string[],
  options: { preface?: string; sourceActionLabel?: string } = {},
): DailyFocusEntry[] {
  return items.map((item, index) => ({
    id: `${document.slug}:${index + 1}`,
    sourceKind,
    sourceSlug: document.slug,
    sourceTitle: document.title,
    sourceHref: `/library/doctrine/${document.slug}`,
    sourceActionLabel: options.sourceActionLabel ?? `Read ${document.title}`,
    label: `${document.title} #${index + 1}`,
    text: item,
    preface: options.preface ?? null,
  }));
}

function parseUtcDayKey(dayKey: string): number {
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(`Daily Focus day key must use YYYY-MM-DD, received: ${dayKey}`);
  }

  const [, year, month, day] = match;

  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

function getUtcDayKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export const dailyFocusPool: DailyFocusEntry[] = (() => {
  const jediBelieve = assertFocusDocument('jedi-believe');
  const threeTenets = assertFocusDocument('three-tenets');
  const sixteenTeachings = assertFocusDocument('16-teachings');
  const twentyOneMaxims = assertFocusDocument('21-maxims');

  return [
    ...createFocusEntries(jediBelieve, 'jedi-believe', jediBelieve.items ?? [], {
      preface: JEDI_BELIEVE_PREFACE,
      sourceActionLabel: 'Read Jedi Believe',
    }),
    ...createFocusEntries(threeTenets, 'three-tenets', resolveThreeTenetsItems(threeTenets.sections, threeTenets.tenets, threeTenets.items), {
      sourceActionLabel: 'Read the Three Tenets',
    }),
    ...createFocusEntries(sixteenTeachings, 'sixteen-teachings', sixteenTeachings.items ?? [], {
      sourceActionLabel: 'Read the 16 Teachings',
    }),
    ...createFocusEntries(twentyOneMaxims, 'twenty-one-maxims', twentyOneMaxims.items ?? [], {
      sourceActionLabel: 'Read the 21 Maxims',
    }),
  ];
})();

export function getDailyFocusDayKey(date: Date): string {
  return getUtcDayKey(date);
}

export function selectDailyFocus(date: Date): DailyFocusSelection {
  if (dailyFocusPool.length === 0) {
    throw new Error('Daily Focus pool cannot be empty.');
  }

  const dayKey = getDailyFocusDayKey(date);
  const anchorTimestamp = parseUtcDayKey(DAILY_FOCUS_ANCHOR_DATE);
  const targetTimestamp = parseUtcDayKey(dayKey);
  const dayOffset = Math.floor((targetTimestamp - anchorTimestamp) / DAY_IN_MILLISECONDS);
  const entryIndex = euclideanModulo(dayOffset, dailyFocusPool.length);
  const entry = dailyFocusPool[entryIndex];

  return {
    ...entry,
    dayKey,
    entryIndex,
    poolSize: dailyFocusPool.length,
  };
}
