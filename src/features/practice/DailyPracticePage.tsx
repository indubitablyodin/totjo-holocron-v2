import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

function formatDayCount(value: number): string {
  return value === 1 ? '1 day' : `${value} days`;
}

export function DailyPracticePage({ now, timeZone, database = appDb }: DailyPracticePageProps) {
  const navigate = useNavigate();
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

  const beginMeditation = () => {
    void navigate('/timer');
  };

  return (
    <PageLayout description="" eyebrow="" title="Daily Focus">
      <div className="home-dashboard">
        <section className="dashboard-region" aria-labelledby="meditation-heading">
          <div className="primary-action-panel">
            <h2 className="primary-action-panel__title" id="meditation-heading">
              Center yourself.
            </h2>
            <button
              className="primary-button button-inline primary-action-panel__action"
              data-testid="daily-begin-meditation"
              onClick={beginMeditation}
              type="button"
            >
              Begin meditation
            </button>
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
            {statsStatus === 'error' ? (
              <p className="surface-error" role="alert">
                Meditation stats could not be loaded on this device.
              </p>
            ) : null}
          </div>
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

        <section className="dashboard-region" aria-labelledby="daily-focus-heading">
          <h2 className="dashboard-region__title" id="daily-focus-heading">
            Today&rsquo;s practice
          </h2>
          <article className="daily-focus-block" data-testid="daily-focus-card">
            <p className="practice-status-pill practice-status-pill--ready" data-testid="daily-focus-day">
              UTC {dailyFocus.dayKey}
            </p>
            <h3 className="daily-practice-card__title" data-testid="daily-practice-title">
              {dailyFocus.sourceTitle}
            </h3>
            {dailyFocus.preface ? <p className="daily-focus-card__preface">{dailyFocus.preface}</p> : null}
            <p className="daily-focus-card__text" data-testid="daily-focus-text">
              {dailyFocus.text}
            </p>
            <p className="support-copy" data-testid="daily-focus-source">
              {dailyFocus.label}
            </p>
            <div className="daily-practice-actions">
              <Link className="secondary-button button-inline" data-testid="daily-open-source" to={dailyFocus.sourceHref}>
                {dailyFocus.sourceActionLabel}
              </Link>
            </div>
          </article>
        </section>
      </div>
    </PageLayout>
  );
}
