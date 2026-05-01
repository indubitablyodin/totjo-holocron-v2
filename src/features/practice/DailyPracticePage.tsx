import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { CompactReaderShell, ReaderMetaList, ReaderSurface, type CompactReaderControl } from '@/features/reader/CompactReaderShell';
import { appDb, type HolocronDatabase } from '@/lib/db';

import {
  DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE,
  formatDailyPracticeClockInputValue,
  loadDailyPracticeClockOverride,
  resolveDailyPracticeNow,
  resolveDailyPracticeTimeZone,
  saveDailyPracticeClockOverride,
  type DailyPracticeClockOverride,
} from './dailyPracticeClock';
import { getDailyPracticeCompletion, markDailyPracticeCompleted } from './dailyPracticeStorage';
import {
  getDailyPracticeSourceLabel,
  getResolvedDailyPracticeTimeZone,
  selectDailyPractice,
  selectDailyPracticeFromLocalDateTime,
} from './dailyPracticeEngine';

type DailyPracticePageProps = {
  now?: Date;
  timeZone?: string;
  database?: HolocronDatabase;
};

type DailyPracticeState = {
  practiceDayId: string;
  status: 'loading' | 'ready' | 'error';
  completedAt: string | null;
};

function getDailyStatusLabel(completedAt: string | null): string {
  return completedAt ? 'Completed' : 'Ready';
}

function TodayTimingPanel({
  clockOverride,
  onChange,
  timeZone,
}: {
  clockOverride: DailyPracticeClockOverride;
  onChange: (override: DailyPracticeClockOverride) => void;
  timeZone: string;
}) {
  return (
    <div className="reader-panel-form">
      <p className="field-label">Practice day timing</p>
      <p className="field-help">If this device clock is wrong, you can set Today by hand.</p>

      <label className="field-card field-card--toggle" htmlFor="daily-clock-override-toggle">
        <span className="field-label">Manual local time</span>
        <span className="field-help">Today will keep using {timeZone}.</span>
        <span className="filter-toggle">
          <input
            checked={clockOverride.enabled}
            data-testid="daily-clock-override-toggle"
            id="daily-clock-override-toggle"
            onChange={(event) => {
              onChange({
                enabled: event.target.checked,
                localDateTime:
                  event.target.checked && clockOverride.localDateTime.length === 0
                    ? formatDailyPracticeClockInputValue(new Date())
                    : clockOverride.localDateTime,
                timeZone:
                  event.target.checked && clockOverride.timeZone.trim().length === 0
                    ? timeZone
                    : clockOverride.timeZone,
              });
            }}
            type="checkbox"
          />
          Use a manual local time for Today
        </span>
      </label>

      <label className="field-card" htmlFor="daily-clock-override-time-zone">
        <span className="field-label">Time zone</span>
          <span className="field-help">Set the time zone for the manual clock.</span>
        <input
          className="field-input"
          data-testid="daily-clock-override-time-zone"
          disabled={!clockOverride.enabled}
          id="daily-clock-override-time-zone"
          onChange={(event) => {
            onChange({
              ...clockOverride,
              timeZone: event.target.value,
            });
          }}
          placeholder="America/Chicago"
          type="text"
          value={clockOverride.timeZone}
        />
      </label>

      <label className="field-card" htmlFor="daily-clock-override-input">
        <span className="field-label">Local time</span>
          <span className="field-help">Set the date and time Today should follow.</span>
        <input
          className="field-input"
          data-testid="daily-clock-override-input"
          disabled={!clockOverride.enabled}
          id="daily-clock-override-input"
          onChange={(event) => {
            onChange({
              ...clockOverride,
              localDateTime: event.target.value,
            });
          }}
          type="datetime-local"
          value={clockOverride.localDateTime}
        />
      </label>

      <div className="reader-panel-form__actions">
        <button
          className="secondary-button button-inline"
          data-testid="daily-clock-override-reset"
          disabled={!clockOverride.enabled && clockOverride.localDateTime.length === 0}
          onClick={() => {
            onChange(DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE);
          }}
          type="button"
        >
          Use device time
        </button>
      </div>
    </div>
  );
}

export function DailyPracticePage({ now, timeZone, database = appDb }: DailyPracticePageProps) {
  const [clockOverride, setClockOverride] = useState<DailyPracticeClockOverride>(() => loadDailyPracticeClockOverride());
  const fallbackTimeZone = useMemo(() => timeZone ?? getResolvedDailyPracticeTimeZone(), [timeZone]);
  const resolvedNow = useMemo(() => {
    if (now) {
      return now;
    }

    return resolveDailyPracticeNow(new Date(), clockOverride);
  }, [clockOverride, now]);
  const resolvedTimeZone = useMemo(
    () => resolveDailyPracticeTimeZone(fallbackTimeZone, clockOverride),
    [clockOverride, fallbackTimeZone],
  );
  const practice = useMemo(
    () =>
      clockOverride.enabled
        ? selectDailyPracticeFromLocalDateTime(clockOverride.localDateTime, resolvedTimeZone) ?? selectDailyPractice(resolvedNow, resolvedTimeZone)
        : selectDailyPractice(resolvedNow, resolvedTimeZone),
    [clockOverride.enabled, clockOverride.localDateTime, resolvedNow, resolvedTimeZone],
  );
  const [practiceState, setPracticeState] = useState<DailyPracticeState>({
    practiceDayId: practice.practiceDayId,
    status: 'loading',
    completedAt: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateClockOverride = (nextOverride: DailyPracticeClockOverride) => {
    setClockOverride(nextOverride);
    saveDailyPracticeClockOverride(nextOverride);
  };

  const controls: CompactReaderControl[] = now
    ? []
    : [
        {
          id: 'timing',
          label: 'Timing',
          panel: <TodayTimingPanel clockOverride={clockOverride} onChange={updateClockOverride} timeZone={resolvedTimeZone} />,
        },
      ];

  useEffect(() => {
    let isMounted = true;

    void getDailyPracticeCompletion(practice.practiceDayId, database)
      .then((record) => {
        if (!isMounted) {
          return;
        }

        setPracticeState({
          practiceDayId: practice.practiceDayId,
          status: 'ready',
          completedAt: record?.completedAt ?? null,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setPracticeState({
          practiceDayId: practice.practiceDayId,
          status: 'error',
          completedAt: null,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [database, practice.practiceDayId]);

  const resolvedPracticeState =
    practiceState.practiceDayId === practice.practiceDayId
      ? practiceState
      : {
          practiceDayId: practice.practiceDayId,
          status: 'loading' as const,
          completedAt: null,
        };

  const handleComplete = async () => {
    if (resolvedPracticeState.completedAt || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const record = await markDailyPracticeCompleted(
        {
          practiceDayId: practice.practiceDayId,
          documentId: practice.document.id,
          completedAt: resolvedNow.toISOString(),
        },
        database,
      );

      setPracticeState({
        practiceDayId: practice.practiceDayId,
        status: 'ready',
        completedAt: record.completedAt,
      });
    } catch {
      setPracticeState({
        practiceDayId: practice.practiceDayId,
        status: 'error',
        completedAt: null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (resolvedPracticeState.status === 'error') {
    return (
      <PageLayout
        description="Today could not open right now on this device."
        eyebrow="Today’s practice"
        title="Today"
      >
        <PageSection description="Try opening today again in a moment." title="Today is unavailable">
          <p className="surface-error" role="alert">
            Today could not open on this device.
          </p>
        </PageSection>
      </PageLayout>
    );
  }

  const completed = Boolean(resolvedPracticeState.completedAt);

  return (
    <CompactReaderShell
      controls={controls}
      description="Open today's reading and mark the day complete when you're done."
      eyebrow="Today’s practice"
      badges={
        <div className="reader-badge-row">
          <span className="reader-kind-pill" data-testid="daily-practice-kind">
            {getDailyPracticeSourceLabel(practice.sourceKind)}
          </span>
          <p
            className={`practice-status-pill practice-status-pill--${completed ? 'completed' : 'ready'}`}
            data-testid="daily-status"
            role="status"
          >
            {resolvedPracticeState.status === 'loading' ? 'Loading…' : getDailyStatusLabel(resolvedPracticeState.completedAt)}
          </p>
        </div>
      }
      meta={
        <ReaderMetaList
          items={[
            { label: 'Date', value: practice.dateLabel },
            { label: 'Reading', value: practice.document.title },
          ]}
        />
      }
      title="Today"
    >
      <ReaderSurface>
        <div className="today-entry-flow">
          <div className="reader-copy">
            <p className="today-entry-flow__label">Today’s reading</p>
            <h2 className="daily-practice-card__title" data-testid="daily-practice-title">
              {practice.title}
            </h2>
            <p className="daily-practice-card__summary">{practice.summary}</p>
            <p className="support-copy">{practice.reflectionPrompt}</p>
          </div>

          <div className="today-entry-flow__actions">
            <Link className="primary-button today-entry-flow__primary-action" data-testid="daily-open-source" to={practice.sourceHref}>
              {practice.sourceActionLabel}
            </Link>

            <div className="today-completion-flow" data-testid="daily-completion-flow">
              <div className="today-completion-flow__copy">
                <p className="field-label">Completion</p>
                <p className="support-copy" data-testid="daily-completion-summary">
                  {completed ? 'Today is marked complete.' : 'Mark today complete after you finish the selected reading.'}
                </p>
              </div>

              <button
                className="secondary-button button-inline"
                data-testid="daily-complete"
                disabled={completed || resolvedPracticeState.status !== 'ready' || isSaving}
                onClick={() => {
                  void handleComplete();
                }}
                type="button"
              >
                {completed ? 'Completed today' : isSaving ? 'Saving…' : 'Mark today complete'}
              </button>
            </div>
          </div>
        </div>
      </ReaderSurface>

      <ReaderSurface muted>
        <div className="section-heading">
          <h2>When Today resets</h2>
          <p>Today changes when the next local practice day begins.</p>
        </div>
        <ReaderMetaList
          items={[
            { label: 'Next reset', value: practice.rolloverLabel },
            {
              label: 'Today’s completion',
              value: `Saved only for ${practice.practiceDayKey}.`,
            },
          ]}
        />
      </ReaderSurface>
    </CompactReaderShell>
  );
}
