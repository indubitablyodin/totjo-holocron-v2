import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { createDefaultTimerSession, applyEditableTimerConfig } from '@/features/timer/timerModel';
import { loadTimerPreferences } from '@/features/timer/timerPreferences';
import { saveTimerSession } from '@/features/timer/timerSessionStorage';
import { appDb, type HolocronDatabase } from '@/lib/db';

import {
  loadDailyPracticeClockOverride,
  resolveDailyPracticeNow,
  resolveDailyPracticeTimeZone,
} from './dailyPracticeClock';
import { selectDailyFocus } from './dailyFocusEngine';
import { getResolvedDailyPracticeTimeZone } from './dailyPracticeEngine';
import { getMeditationPracticeStats, type MeditationPracticeStats } from './dailyPracticeStorage';

type DailyPracticePageProps = {
  now?: Date;
  timeZone?: string;
  database?: HolocronDatabase;
};

type MeditationPreset = {
  label: string;
  seconds: number;
};

const MEDITATION_PRESETS: MeditationPreset[] = [
  { label: '1 minute', seconds: 60 },
  { label: '5 minutes', seconds: 300 },
  { label: '30 minutes', seconds: 1800 },
];

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
  const [selectedPresetSeconds, setSelectedPresetSeconds] = useState(MEDITATION_PRESETS[1].seconds);
  const [meditationStats, setMeditationStats] = useState<MeditationPracticeStats>(EMPTY_MEDITATION_STATS);
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

  const beginMeditation = () => {
    const preferences = loadTimerPreferences();
    const presetSession = applyEditableTimerConfig(createDefaultTimerSession(preferences), {
      totalDurationSeconds: selectedPresetSeconds,
    });

    saveTimerSession(presetSession);
    void navigate('/timer');
  };

  return (
    <PageLayout
      description="A single doctrine focus, a simple meditation path, and your saved reading shortcuts stay on this device."
      eyebrow="Daily practice"
      title="Daily Focus"
    >
      <PageSection description="One shared offline focus is selected by the UTC day from structured TOTJO doctrine." title="Daily Focus">
        <article className="daily-focus-card" data-testid="daily-focus-card">
          <div className="daily-focus-card__header">
            <p className="today-entry-flow__label">Daily Focus</p>
            <p className="practice-status-pill practice-status-pill--ready" data-testid="daily-focus-day">
              UTC {dailyFocus.dayKey}
            </p>
          </div>

          <div className="reader-copy">
            <h2 className="daily-practice-card__title" data-testid="daily-practice-title">
              {dailyFocus.sourceTitle}
            </h2>
            {dailyFocus.preface ? <p className="daily-focus-card__preface">{dailyFocus.preface}</p> : null}
            <p className="daily-focus-card__text" data-testid="daily-focus-text">
              {dailyFocus.text}
            </p>
            <p className="support-copy" data-testid="daily-focus-source">
              {dailyFocus.label} from {dailyFocus.sourceTitle}.
            </p>
          </div>

          <div className="daily-practice-actions">
            <Link className="secondary-button button-inline" data-testid="daily-open-source" to={dailyFocus.sourceHref}>
              {dailyFocus.sourceActionLabel}
            </Link>
          </div>
        </article>
      </PageSection>

      <PageSection description="Center yourself." title="Meditation">
        <article className="daily-meditation-card" data-testid="daily-meditation-card">
          <div className="daily-focus-card__header">
            <div>
              <p className="today-entry-flow__label">Quick meditation</p>
              <h2 className="daily-practice-card__title">Center yourself.</h2>
            </div>
          </div>

          <dl className="timer-stat-strip" data-testid="meditation-stats">
            <div className="timer-stat-card">
              <dt>Total meditation days</dt>
              <dd data-testid="meditation-total-days">
                {statsStatus === 'loading' ? 'Loading…' : formatDayCount(meditationStats.totalDistinctDays)}
              </dd>
            </div>
            <div className="timer-stat-card">
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

          <fieldset className="daily-preset-group">
            <legend className="field-label">Duration</legend>
            <div className="reader-option-group__choices" data-testid="daily-meditation-presets">
              {MEDITATION_PRESETS.map((preset) => (
                <button
                  aria-pressed={selectedPresetSeconds === preset.seconds}
                  className={`reader-option-button${selectedPresetSeconds === preset.seconds ? ' reader-option-button--active' : ''}`}
                  data-testid={`daily-meditation-preset-${preset.seconds}`}
                  key={preset.seconds}
                  onClick={() => {
                    setSelectedPresetSeconds(preset.seconds);
                  }}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="button-row">
            <button className="primary-button button-inline" data-testid="daily-begin-meditation" onClick={beginMeditation} type="button">
              Begin meditation
            </button>
            <button
              className="secondary-button button-inline"
              data-testid="daily-cancel-meditation"
              onClick={() => {
                setSelectedPresetSeconds(MEDITATION_PRESETS[1].seconds);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </article>
      </PageSection>

      <PageSection description="Open common local reading surfaces quickly." title="Quick access">
        <div className="daily-quick-access" data-testid="daily-quick-access">
          <Link className="settings-link-card" data-testid="daily-quick-access-jedi-code" to="/library/doctrine/code">
            <span className="settings-link-card__content">
              <span className="field-label">Doctrine</span>
              <span className="daily-quick-access__title">Jedi Code</span>
            </span>
            <span className="settings-link-card__summary">Open the doctrine code.</span>
            <span className="settings-link-card__action">Open</span>
          </Link>
          <Link className="settings-link-card" data-testid="daily-quick-access-knights-code" to="/library/supplemental/knights-code">
            <span className="settings-link-card__content">
              <span className="field-label">Default slot</span>
              <span className="daily-quick-access__title">Knight’s Code</span>
            </span>
            <span className="settings-link-card__summary">Open the study text.</span>
            <span className="settings-link-card__action">Open</span>
          </Link>
          <Link className="settings-link-card" data-testid="daily-quick-access-bookmarks" to="/library/bookmarks">
            <span className="settings-link-card__content">
              <span className="field-label">Saved</span>
              <span className="daily-quick-access__title">Bookmarks</span>
            </span>
            <span className="settings-link-card__summary">Open saved sermons, bookmarks, and notes.</span>
            <span className="settings-link-card__action">Open</span>
          </Link>
        </div>
      </PageSection>
    </PageLayout>
  );
}
