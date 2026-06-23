import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
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

const TIMER_OPTIONS = [5, 10, 15, 20, 30];

function formatDayCount(value: number): string {
  return value === 1 ? '1 day' : `${value} days`;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function StreakCalendar({ completedDates }: { completedDates: Set<string> }) {
  const days = Array.from({ length: 70 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (69 - i));
    return d.toISOString().slice(0, 10);
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="streak-calendar-container">
      <div className="streak-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="streak-grid" aria-hidden="true" data-testid="streak-calendar">
        {days.map((day) => {
          const isCompleted = completedDates.has(day);
          const isToday = day === todayKey;

          return (
            <div
              key={day}
              className={`streak-day${isCompleted ? ' completed' : ''}${isToday ? ' today' : ''}`}
              title={`${day}: ${isCompleted ? 'Completed' : 'Missed'}`}
            />
          );
        })}
      </div>
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
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());

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

        if (isMounted) {
          setCompletedDates(dateSet);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCompletedDates(new Set());
        }
      });

    return () => {
      isMounted = false;
    };
  }, [database, resolvedTimeZone]);

  return (
    <PageLayout description="" eyebrow="" title="Daily Focus">
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
          <h2 id="meditation-heading">Meditation</h2>

          <div className="meditation-config">
            <Link
              className="meditation-start-btn"
              data-testid="meditation-begin"
              to={`/timer?duration=${selectedMinutes}`}
            >
              Begin
            </Link>

            <button
              className="timer-picker-trigger"
              aria-expanded={showTimePicker}
              aria-label="Change meditation duration"
              data-testid="meditation-time-picker"
              onClick={() => {
                setShowTimePicker(!showTimePicker);
              }}
              type="button"
            >
              {selectedMinutes} min
            </button>
          </div>

          {showTimePicker ? (
            <div
              className="timer-picker-dropdown"
              data-testid="meditation-time-options"
              role="listbox"
              aria-label="Select duration"
            >
              {TIMER_OPTIONS.map((time) => (
                <button
                  key={time}
                  role="option"
                  aria-selected={time === selectedMinutes}
                  className={`timer-option${time === selectedMinutes ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedMinutes(time);
                    setShowTimePicker(false);
                  }}
                  type="button"
                >
                  {time} min
                </button>
              ))}
            </div>
          ) : null}

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
                <strong>{meditationStats.currentStreakDays}</strong> days
              </span>
              <span className="streak-total">{meditationStats.totalDistinctDays} total</span>
            </div>
          </div>
          <StreakCalendar completedDates={completedDates} />
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
