import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

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
      })
      .catch(() => {
        if (isMounted) {
          setMiddleQuickAccessSlot(null);
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

        <section className="dashboard-region" aria-labelledby="quick-nav-heading">
          <h2 className="dashboard-region__title" id="quick-nav-heading">
            Go to
          </h2>
          <div className="action-grid">
            <Link className="first-order-link" data-testid="nav-daily" to="/daily">
              Focus
            </Link>
            <Link className="first-order-link" data-testid="nav-library" to="/library">
              Library
            </Link>
            <Link className="first-order-link" data-testid="nav-timer" to="/timer">
              Timer
            </Link>
            <Link className="first-order-link" data-testid="nav-settings" to="/settings">
              Settings
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

        <section className="dashboard-region">
          <div className="daily-quick-access" data-testid="daily-quick-access">
            <Link className="daily-quick-access__button" data-testid="daily-quick-access-jedi-code" to="/library/doctrine/code">
              Jedi Code
            </Link>
            <Link
              className="daily-quick-access__button"
              data-testid="daily-quick-access-middle-slot"
              to={middleQuickAccessSlot?.href ?? '/settings/focus-practice'}
            >
              {middleQuickAccessSlot?.title ?? 'Default slot'}
            </Link>
            <Link className="daily-quick-access__button" data-testid="daily-quick-access-bookmarks" to="/library/bookmarks">
              Bookmarks
            </Link>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
