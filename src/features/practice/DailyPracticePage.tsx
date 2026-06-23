import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { DashboardTimer } from '@/features/timer/DashboardTimer';
import { TimerSettingsButton } from '@/features/timer/TimerSettingsButton';
import { TimerSettingsPanel } from '@/features/timer/TimerSettingsPanel';
import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

import { getSermonDocuments } from '@/features/sermons/sermonSync';
import type { SermonDocumentRecord } from '@/features/sermons/types';

import {
  loadDailyPracticeClockOverride,
  resolveDailyPracticeNow,
  resolveDailyPracticeTimeZone,
} from './dailyPracticeClock';
import { selectDailyFocus } from './dailyFocusEngine';
import { getResolvedDailyPracticeTimeZone } from './dailyPracticeEngine';
import { getMeditationPracticeStats, type MeditationPracticeStats } from './dailyPracticeStorage';
import {
  createDailyQuickAccessChoices,
  getDailyQuickAccessChoiceById,
  loadDailyQuickAccessMiddleSlotId,
  type DailyQuickAccessChoice,
} from './dailyQuickAccess';

type DailyPracticePageProps = {
  now?: Date;
  timeZone?: string;
  database?: HolocronDatabase;
};

const EMPTY_MEDITATION_STATS: MeditationPracticeStats = {
  totalDistinctDays: 0,
  currentStreakDays: 0,
};

function formatDayCount(value: number): string {
  return value === 1 ? '1 day' : `${value} days`;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function MonthCalendar({ completedDates, streakStartDate }: { completedDates: Set<string>; streakStartDate: string | null }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  type Cell = { date: Date; isCurrentMonth: boolean; dayKey: string };
  const cells: Cell[] = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    cells.push({ date, isCurrentMonth: false, dayKey: formatDateKey(date) });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({ date, isCurrentMonth: true, dayKey: formatDateKey(date) });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const date = new Date(year, month + 1, day);
    cells.push({ date, isCurrentMonth: false, dayKey: formatDateKey(date) });
  }

  const todayKey = formatDateKey(new Date());
  const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="month-calendar" data-testid="streak-calendar">
      <div className="calendar-nav">
        <button
          className="calendar-nav-btn"
          aria-label="Previous month"
          onClick={() => {
            setViewMonth(new Date(year, month - 1, 1));
          }}
          type="button"
        >
          &larr;
        </button>
        <span className="calendar-month-label">{monthName}</span>
        <button
          className="calendar-nav-btn"
          aria-label="Next month"
          onClick={() => {
            setViewMonth(new Date(year, month + 1, 1));
          }}
          type="button"
        >
          &rarr;
        </button>
      </div>
      <div className="calendar-weekdays">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div className="calendar-grid">
        {cells.map((cell, i) => {
          const isCompleted = completedDates.has(cell.dayKey);
          const isToday = cell.dayKey === todayKey;
          const classes = [
            'calendar-day',
            !cell.isCurrentMonth && 'other-month',
            isCompleted && 'completed',
            isToday && 'today',
          ].filter(Boolean).join(' ');

          return (
            <div key={i} className={classes} title={`${cell.dayKey}: ${isCompleted ? 'Completed' : 'Not completed'}`}>
              {cell.date.getDate()}
            </div>
          );
        })}
      </div>
      {streakStartDate ? (
        <p className="streak-start-info">
          Current streak started:{' '}
          <strong>
            {new Date(streakStartDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </strong>
        </p>
      ) : null}
    </div>
  );
}

export function DailyPracticePage({ now, timeZone, database = appDb }: DailyPracticePageProps) {
  const [clockOverride] = useState(() => loadDailyPracticeClockOverride());
  const fallbackTimeZone = useMemo(() => timeZone ?? getResolvedDailyPracticeTimeZone(), [timeZone]);
  const resolvedNow = useMemo(() => (now ? now : resolveDailyPracticeNow(new Date(), clockOverride)), [clockOverride, now]);
  const resolvedTimeZone = useMemo(
    () => resolveDailyPracticeTimeZone(fallbackTimeZone, clockOverride),
    [clockOverride, fallbackTimeZone],
  );
  const dailyFocus = useMemo(() => selectDailyFocus(resolvedNow), [resolvedNow]);
  const [meditationStats, setMeditationStats] = useState<MeditationPracticeStats>(EMPTY_MEDITATION_STATS);
  const [middleQuickAccessSlot, setMiddleQuickAccessSlot] = useState<DailyQuickAccessChoice | null>(null);
  const [statsStatus, setStatsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [latestSermon, setLatestSermon] = useState<SermonDocumentRecord | null>(null);
  const [sermonStatus, setSermonStatus] = useState<'loading' | 'ready' | 'empty'>('loading');
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [streakStartDate, setStreakStartDate] = useState<string | null>(null);
  const [timerSettingsOpen, setTimerSettingsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getMeditationPracticeStats(resolvedNow, resolvedTimeZone, database)
      .then((nextStats) => {
        if (!isMounted) {
          return;
        }

        setMeditationStats(nextStats);
        setStatsStatus('ready');
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setMeditationStats(EMPTY_MEDITATION_STATS);
        setStatsStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [database, resolvedNow, resolvedTimeZone]);

  useEffect(() => {
    let isMounted = true;

    void ensureStorageReady(database)
      .then(async () => {
        const [documents, downloads] = await Promise.all([database.documents.toArray(), database.downloads.toArray()]);
        const choices = createDailyQuickAccessChoices(documents, downloads);
        const selectedChoice = getDailyQuickAccessChoiceById(loadDailyQuickAccessMiddleSlotId(), choices);

        if (isMounted) {
          setMiddleQuickAccessSlot(selectedChoice);
        }

        const sermons = await getSermonDocuments(database);
        if (isMounted) {
          setLatestSermon(sermons[0] ?? null);
          setSermonStatus(sermons.length > 0 ? 'ready' : 'empty');
        }
      })
      .catch(() => {
        if (isMounted) {
          setMiddleQuickAccessSlot(null);
          setSermonStatus('empty');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [database]);

  useEffect(() => {
    let isMounted = true;

    void ensureStorageReady(database)
      .then(async () => {
        const entries = await database.practiceHistory
          .where('practiceKind').equals('meditation')
          .toArray();

        const dateSet = new Set<string>();

        entries.forEach((entry) => {
          if (entry.durationSeconds <= 0) {
            return;
          }

          const date = new Date(entry.completedAt);

          if (Number.isNaN(date.getTime())) {
            return;
          }

          const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: resolvedTimeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).formatToParts(date);

          const year = parts.find((part) => part.type === 'year')?.value;
          const month = parts.find((part) => part.type === 'month')?.value;
          const day = parts.find((part) => part.type === 'day')?.value;

          if (year && month && day) {
            dateSet.add(`${year}-${month}-${day}`);
          }
        });

        const todayKey = formatDateKey(new Date());
        const yesterdayKey = formatDateKey(new Date(Date.now() - 86400000));

        let streakStart: string | null = null;
        const checkDate = dateSet.has(todayKey)
          ? new Date()
          : dateSet.has(yesterdayKey)
            ? new Date(Date.now() - 86400000)
            : null;

        if (checkDate) {
          const walkDate = new Date(checkDate);
          while (dateSet.has(formatDateKey(walkDate))) {
            streakStart = formatDateKey(walkDate);
            walkDate.setDate(walkDate.getDate() - 1);
          }
        }

        if (isMounted) {
          setCompletedDates(dateSet);
          setStreakStartDate(streakStart);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCompletedDates(new Set());
          setStreakStartDate(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [database, resolvedTimeZone]);

  return (
    <PageLayout description="" eyebrow="" title="">
      <div className="home-dashboard">
        <section
          className="dashboard-region daily-practice-hero"
          aria-labelledby="practice-heading"
          data-testid="daily-focus-card"
        >
          <h1 id="practice-heading">Today&rsquo;s Practice</h1>
          {dailyFocus.preface ? <p className="daily-focus-card__preface">{dailyFocus.preface}</p> : null}
          <p className="practice-summary" data-testid="daily-practice-text">
            {dailyFocus.text}
          </p>
          <p className="support-copy" data-testid="daily-focus-source">
            {dailyFocus.label}
          </p>
          <Link
            className="primary-button button-inline"
            data-testid="daily-open-source"
            to={dailyFocus.sourceHref}
          >
            Read full {dailyFocus.sourceTitle}
          </Link>
        </section>

        <section className="dashboard-region primary-action-panel" aria-labelledby="meditation-heading">
          <div className="panel-title-row">
            <h2 id="meditation-heading">Meditation</h2>
            <TimerSettingsButton
              isOpen={timerSettingsOpen}
              onToggle={() => {
                setTimerSettingsOpen(!timerSettingsOpen);
              }}
            />
          </div>

          <DashboardTimer />
          <TimerSettingsPanel isOpen={timerSettingsOpen} />

          <dl className="stat-strip" data-testid="meditation-stats">
            <div className="stat-card">
              <dt>Total meditation days</dt>
              <dd data-testid="meditation-total-days">
                {statsStatus === 'loading' ? 'Loading…' : formatDayCount(meditationStats.totalDistinctDays)}
              </dd>
            </div>
            <div className="stat-card">
              <dt>Current streak</dt>
              <dd data-testid="meditation-current-streak">
                {statsStatus === 'loading' ? 'Loading…' : formatDayCount(meditationStats.currentStreakDays)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="dashboard-region streak-card" aria-labelledby="streak-heading">
          <div className="streak-header">
            <h2 id="streak-heading">Your Streak</h2>
            <div className="streak-stats">
              <span>
                <strong>{meditationStats.currentStreakDays}</strong> day streak
              </span>
              <span className="streak-total">{meditationStats.totalDistinctDays} total days</span>
            </div>
          </div>
          <MonthCalendar completedDates={completedDates} streakStartDate={streakStartDate} />
        </section>

        <section className="dashboard-region" aria-labelledby="lanes-heading">
          <h2 className="dashboard-region__title" id="lanes-heading">
            Quick lanes
          </h2>
          <div className="lane-grid">
            {sermonStatus === 'ready' && latestSermon ? (
              <Link
                className="lane-card lane-card--sermon"
                data-testid="daily-quick-access-jedi-code"
                to={`/library/sermons/${latestSermon.slug}`}
              >
                <span className="lane-card__badge">New</span>
                <p className="lane-card__title">{latestSermon.title}</p>
                <p className="lane-card__summary">{latestSermon.summary}</p>
              </Link>
            ) : (
              <Link
                className="lane-card lane-card--study"
                data-testid="daily-quick-access-jedi-code"
                to="/library/doctrine/code"
              >
                <span className="lane-card__icon">&#9997;</span>
                <p className="lane-card__title">Study Doctrine</p>
                <p className="lane-card__summary">Read the Jedi Code and core teachings.</p>
              </Link>
            )}

            <Link
              className="lane-card lane-card--focus"
              data-testid="daily-quick-access-middle-slot"
              to={middleQuickAccessSlot?.href ?? '/settings/focus-practice'}
            >
              <span className="lane-card__icon">&#9733;</span>
              <p className="lane-card__title">{middleQuickAccessSlot?.title ?? 'Default slot'}</p>
              <p className="lane-card__summary">Continue where you left off.</p>
            </Link>

            <Link
              className="lane-card lane-card--bookmark"
              data-testid="daily-quick-access-bookmarks"
              to="/library/bookmarks"
            >
              <span className="lane-card__icon">&#10022;</span>
              <p className="lane-card__title">My Bookmarks</p>
              <p className="lane-card__summary">Pick up where you left off.</p>
            </Link>

            <Link
              className="lane-card lane-card--focus"
              data-testid="daily-quick-access-timer"
              to="/timer"
            >
              <span className="lane-card__icon">&#9716;</span>
              <p className="lane-card__title">Meditation Timer</p>
              <p className="lane-card__summary">Set a focus session.</p>
            </Link>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
