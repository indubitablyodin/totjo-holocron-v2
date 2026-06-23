import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import {
  getBundledAudioRightsAssets,
  getCueKindLabel,
  getSoundProfileById,
  SOUND_PROFILES,
  type CueKind,
  type SoundProfileId,
} from '@/features/timer/audioProfiles';
import {
  clearTimerSessionStorage,
  loadTimerSession,
  saveTimerSession,
} from '@/features/timer/timerSessionStorage';
import {
  formatTimerClock,
  shouldPlayTimerCue,
} from '@/features/timer/timerModel';
import { loadTimerPreferences, type TimerCueMode } from '@/features/timer/timerPreferences';
import { listMeditationPracticeHistory, recordMeditationPractice } from '@/features/timer/timerHistory';
import { useTimerSession } from '@/features/timer/useTimerSession';
import { TimerControls } from '@/features/timer/TimerControls';

type AudioStatus = 'ready' | 'silent' | 'unavailable';

type MeditationPreset = {
  label: string;
  seconds: number;
};

const MEDITATION_PRESETS: MeditationPreset[] = [
  { label: '1 minute', seconds: 60 },
  { label: '5 minutes', seconds: 300 },
  { label: '30 minutes', seconds: 1800 },
];

const TIMER_CUE_MODE_LABELS: Record<TimerCueMode, string> = {
  'start-end': 'Beginning and end',
  'start-only': 'Beginning only',
  'end-only': 'End only',
  custom: 'Custom spacing',
};

function formatHistoryTimestamp(isoTimestamp: string) {
  return isoTimestamp.slice(0, 16).replace('T', ' ');
}

function formatDurationSummary(seconds: number) {
  return `${formatTimerClock(seconds)} (${seconds} sec)`;
}

function toSentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

function useAudioElements(soundProfileId: SoundProfileId) {
  const audioElementsRef = useRef<Partial<Record<CueKind, HTMLAudioElement>>>({});
  const audioStatus: AudioStatus = useMemo(() => {
    const profile = getSoundProfileById(soundProfileId);

    if (profile.id === 'silent') {
      return 'silent';
    }

    return typeof Audio === 'undefined' ? 'unavailable' : 'ready';
  }, [soundProfileId]);

  useEffect(() => {
    const profile = getSoundProfileById(soundProfileId);

    if (profile.id === 'silent') {
      audioElementsRef.current = {};
      return;
    }

    if (typeof Audio === 'undefined') {
      audioElementsRef.current = {};
      return;
    }

    const nextAudioElements: Partial<Record<CueKind, HTMLAudioElement>> = {};

    (Object.entries(profile.cuePaths) as Array<[CueKind, string]>).forEach(([cueKind, source]) => {
      const audio = new Audio(source);
      audio.preload = 'auto';
      audio.load();
      nextAudioElements[cueKind] = audio;
    });

    audioElementsRef.current = nextAudioElements;

    return () => {
      Object.values(nextAudioElements).forEach((audio) => {
        if (!audio) {
          return;
        }

        audio.pause();
        audio.src = '';
      });
    };
  }, [soundProfileId]);

  return {
    audioElementsRef,
    audioStatus,
  };
}

export function TimerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const savedSession = useMemo(() => loadTimerSession(), []);
  const urlDuration = searchParams.get('duration');
  const parsedDuration = urlDuration ? parseInt(urlDuration, 10) : NaN;
  const isActiveSession = savedSession.phase === 'running' || savedSession.phase === 'paused';

  const initialDurationSeconds = !Number.isNaN(parsedDuration) && parsedDuration > 0
    ? parsedDuration * 60
    : isActiveSession
      ? savedSession.totalDurationSeconds
      : undefined;

  const [lastCueMessage, setLastCueMessage] = useState('No cue has played yet.');
  const [historyEntries, setHistoryEntries] = useState<Array<{ id: string; completedAt: string; durationSeconds: number }>>([]);
  const [showTimerDetails, setShowTimerDetails] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [audioProfileId, setAudioProfileId] = useState(
    isActiveSession ? savedSession.soundProfileId : loadTimerPreferences().defaultSoundProfileId,
  );

  const { audioElementsRef, audioStatus } = useAudioElements(audioProfileId);

  const playCue = useCallback(
    async (cueKind: CueKind, soundProfileId: SoundProfileId) => {
      const profile = getSoundProfileById(soundProfileId);

      if (profile.id === 'silent') {
        setLastCueMessage(`${getCueKindLabel(cueKind)} cue skipped because the silent profile is active.`);
        return;
      }

      const audio = audioElementsRef.current[cueKind];

      if (!audio) {
        setLastCueMessage(`${getCueKindLabel(cueKind)} cue is unavailable in this environment.`);
        return;
      }

      try {
        audio.currentTime = 0;
        await audio.play();
      } catch {
        setLastCueMessage(
          'Bell playback was blocked or unavailable. Tap Test bell, check device volume, or choose another sound.',
        );
        return;
      }

      setLastCueMessage(`${getCueKindLabel(cueKind)} cue played with ${profile.label}.`);
    },
    [audioElementsRef],
  );

  const testBell = useCallback(
    async (soundProfileId: SoundProfileId) => {
      const profile = getSoundProfileById(soundProfileId);

      if (profile.id === 'silent') {
        setLastCueMessage('Silent profile selected. No cue to play.');
        return;
      }

      await playCue('start', soundProfileId);
    },
    [playCue],
  );

  const refreshHistory = useCallback(async () => {
    const entries = await listMeditationPracticeHistory(5);
    setHistoryEntries(entries);
  }, []);

  useEffect(() => {
    let isActive = true;

    void listMeditationPracticeHistory(5).then((entries) => {
      if (isActive) {
        setHistoryEntries(entries);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const bundledAudioRightsAssets = useMemo(() => getBundledAudioRightsAssets(), []);

  const {
    session,
    isIdle,
    isRunning,
    isPaused,
    isComplete,
    clockDisplay,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    setDurationMinutes,
    handleReset,
    handleConfigUpdate,
  } = useTimerSession({
    initialDurationSeconds,
    initialSession: isActiveSession ? savedSession : undefined,
    onComplete: async (event) => {
      await recordMeditationPractice(event);
      await refreshHistory();
    },
    onCue: async (cue) => {
      if (cue === 'start') {
        primeAudio(session.soundProfileId);
      }

      if (cue === 'complete' || cue === 'start') {
        const cueKind = cue === 'start' ? 'start' : 'complete';
        await playCue(cueKind, session.soundProfileId);
      }
    },
  });

  useEffect(() => {
    saveTimerSession(session);
    setAudioProfileId(session.soundProfileId);
  }, [session]);

  const primeAudio = useCallback((soundProfileId: SoundProfileId) => {
    const profile = getSoundProfileById(soundProfileId);

    if (profile.id === 'silent' || typeof Audio === 'undefined') {
      return;
    }

    const startCuePath = profile.cuePaths.start;

    if (!startCuePath) {
      return;
    }

    try {
      const primer = new Audio(startCuePath);
      primer.volume = 0.01;
      void primer.play().then(() => {
        primer.pause();
        primer.src = '';
      }).catch(() => {
        // Priming can fail if already primed.
      });
    } catch {
      // Not critical.
    }
  }, []);

  const canEditSession = isIdle || isComplete;
  const soundProfile = getSoundProfileById(session.soundProfileId);
  const timerStatusLabel = toSentenceCase(session.phase);
  const audioStatusLabel =
    audioStatus === 'silent'
      ? 'Silent profile'
      : audioStatus === 'ready'
        ? 'Bundled cues ready'
        : 'Audio unavailable';

  return (
    <PageLayout
      description=""
      eyebrow="Meditation timer"
      title="Timer"
      headerActions={<Link aria-label="Open timer defaults in settings" className="gear-link" data-testid="timer-gear-link" to="/settings/timer-defaults" title="Timer defaults">⚙</Link>}
    >
      <PageSection description="" title="Start a session">
        <div className="timer-grid">
          <section className="content-section timer-display timer-display--hero" data-testid="timer-panel">
            <div className="timer-readout timer-readout--centered">
              <p className="metric-label">Remaining</p>
              {canEditSession && editingDuration ? (
                <label className="inline-duration-edit">
                  <span className="field-help">Seconds</span>
                  <input
                    autoFocus
                    className="timer-clock-input"
                    data-testid="timer-duration-seconds"
                    inputMode="numeric"
                    onBlur={() => setEditingDuration(false)}
                    onChange={(event) => {
                      const raw = event.target.value;

                      if (raw === '') {
                        return;
                      }

                      const parsed = Number.parseInt(raw, 10);

                      if (Number.isNaN(parsed)) {
                        return;
                      }

                      setDurationMinutes(parsed / 60);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === 'Escape') {
                        setEditingDuration(false);
                      }
                    }}
                    type="text"
                    value={String(session.totalDurationSeconds)}
                  />
                </label>
              ) : (
                <button
                  className="timer-clock timer-clock--editable"
                  data-testid="timer-remaining"
                  disabled={!canEditSession}
                  onClick={() => setEditingDuration(true)}
                  type="button"
                >
                  {clockDisplay}
                </button>
              )}
              <p className="status-pill" data-testid="timer-status">
                {timerStatusLabel}
              </p>
            </div>

            <fieldset className="timer-preset-group">
              <legend className="field-label">Quick duration</legend>
              <div className="reader-option-group__choices" data-testid="timer-meditation-presets">
                {MEDITATION_PRESETS.map((preset) => (
                  <button
                    aria-pressed={session.totalDurationSeconds === preset.seconds}
                    className={`reader-option-button${session.totalDurationSeconds === preset.seconds ? ' reader-option-button--active' : ''}`}
                    data-testid={`timer-meditation-preset-${preset.seconds}`}
                    disabled={!canEditSession}
                    key={preset.seconds}
                    onClick={() => {
                      setEditingDuration(false);
                      setDurationMinutes(preset.seconds / 60);
                    }}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="timer-advanced-toggle">
              <button
                aria-expanded={showAdvancedSettings}
                className="gear-link"
                data-testid="timer-advanced-toggle"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                title={showAdvancedSettings ? 'Hide session settings' : 'Session settings'}
                type="button"
              >
                {showAdvancedSettings ? '▾' : '⚙'}
              </button>
            </div>

            {showAdvancedSettings ? (
              <div className="timer-inline-controls">
                <label className="inline-control">
                  <span className="field-help">Bell mode</span>
                  <select
                    className="field-select"
                    data-testid="timer-cue-mode"
                    disabled={!canEditSession}
                    onChange={(event) => {
                      const nextCueMode = event.target.value as TimerCueMode;
                      handleConfigUpdate({
                        cueMode: nextCueMode,
                        intervalSeconds: nextCueMode === 'custom' ? 60 : 0,
                      });
                    }}
                    value={session.cueMode}
                  >
                    {(Object.keys(TIMER_CUE_MODE_LABELS) as TimerCueMode[]).map((cueMode) => (
                      <option key={cueMode} value={cueMode}>
                        {TIMER_CUE_MODE_LABELS[cueMode]}
                      </option>
                    ))}
                  </select>
                </label>

                {session.cueMode === 'custom' ? (
                  <label className="inline-control">
                    <span className="field-help">Ring every (s)</span>
                    <input
                      className="field-select"
                      data-testid="timer-interval-seconds"
                      disabled={!canEditSession}
                      inputMode="numeric"
                      min={1}
                      onChange={(event) => {
                      const raw = event.target.value;
                      handleConfigUpdate({
                        intervalSeconds: raw,
                      });
                    }}
                      type="number"
                      value={session.intervalSeconds}
                    />
                  </label>
                ) : null}

                <label className="inline-control">
                  <span className="field-help">Bell sound</span>
                  <select
                    className="field-select"
                    data-testid="timer-sound-profile"
                    disabled={!canEditSession}
                    onChange={(event) => {
                      handleConfigUpdate({
                        soundProfileId: event.target.value as SoundProfileId,
                      });
                    }}
                    value={session.soundProfileId}
                  >
                    {SOUND_PROFILES.map((profileOption) => (
                      <option key={profileOption.id} value={profileOption.id}>
                        {profileOption.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="secondary-button button-inline"
                  data-testid="timer-test-bell"
                  disabled={!canEditSession}
                  onClick={() => {
                    void testBell(session.soundProfileId);
                  }}
                  type="button"
                >
                  Test bell
                </button>

                <label className="filter-toggle timer-checkbox">
                  <input
                    checked={session.recordPracticeHistory}
                    data-testid="timer-record-history"
                    disabled={!canEditSession}
                    onChange={(event) => {
                      handleConfigUpdate({
                        recordPracticeHistory: event.target.checked,
                      });
                    }}
                    type="checkbox"
                  />
                  <span className="field-help">Save history</span>
                </label>
              </div>
            ) : null}

            <div className="timer-controls">
              {isIdle ? (
                <button
                  className="primary-button"
                  data-testid="timer-start"
                    onClick={() => {
                      handleStart(session.totalDurationSeconds / 60);
                    }}
                  type="button"
                >
                  Start timer
                </button>
              ) : null}

              {isRunning || isPaused ? (
                <TimerControls
                  isRunning={isRunning}
                  isPaused={isPaused}
                  onPause={handlePause}
                  onResume={handleResume}
                  onStop={handleStop}
                />
              ) : null}

              <button
                className="secondary-button"
                data-testid="timer-reset"
                onClick={() => {
                  clearTimerSessionStorage();
                  handleReset();
                  setLastCueMessage('Timer reset and ready for a new session.');
                }}
                type="button"
              >
                Reset session
              </button>

              <button
                className="secondary-button"
                data-testid="timer-cancel"
                onClick={() => {
                  clearTimerSessionStorage();
                  setShowTimerDetails(false);
                  setEditingDuration(false);
                  void navigate('/daily');
                }}
                type="button"
              >
                Cancel
              </button>
            </div>

            <div className="panel-toggle-block">
              <button
                aria-expanded={showTimerDetails}
                className="secondary-button button-inline"
                data-testid="timer-details-toggle"
                onClick={() => {
                  setShowTimerDetails((currentValue) => !currentValue);
                }}
                type="button"
              >
                {showTimerDetails ? 'Hide history and details' : 'History and details'}
              </button>

              {showTimerDetails ? (
                <div className="panel-toggle-body">
                  <section className="timer-subsection">
                    <div className="section-heading">
                      <h3>Recent meditation sessions</h3>
                      <p>Completed sessions saved on this device appear here.</p>
                    </div>

                    {historyEntries.length > 0 ? (
                      <ol className="history-list" data-testid="practice-history-list">
                        {historyEntries.map((entry) => (
                          <li className="detail-card" key={entry.id}>
                            <p className="detail-card__eyebrow">Meditation</p>
                            <h3>{formatDurationSummary(entry.durationSeconds)}</h3>
                            <p>Completed {formatHistoryTimestamp(entry.completedAt)}</p>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="support-copy">No meditation sessions saved yet.</p>
                    )}
                  </section>

                  <dl className="detail-list">
                    <div>
                      <dt>Total duration</dt>
                      <dd data-testid="timer-total-duration">{formatDurationSummary(session.totalDurationSeconds)}</dd>
                    </div>
                    <div>
                      <dt>Cue audio</dt>
                      <dd data-testid="timer-audio-status">{audioStatusLabel}</dd>
                    </div>
                    <div>
                      <dt>Active profile</dt>
                      <dd>{soundProfile.label}</dd>
                    </div>
                    <div>
                      <dt>Last cue</dt>
                      <dd data-testid="timer-last-cue">{lastCueMessage}</dd>
                    </div>
                  </dl>

                  <dl className="detail-list">
                    <div>
                      <dt>When you leave the page</dt>
                      <dd>Timer keeps its place. If you switch apps and come back, the timer catches up to the time that passed.</dd>
                    </div>
                    <div>
                      <dt>Cue sound</dt>
                      <dd>Works offline. Cue sounds stay with the app, so the timer still works without a connection.</dd>
                    </div>
                  </dl>

                  <section className="timer-subsection">
                    <div className="section-heading">
                      <h3>Cue sound details</h3>
                      <p>The timer uses the same recorded rights details shown in Settings.</p>
                    </div>

                    <div className="detail-list">
                      {bundledAudioRightsAssets.map((asset) => (
                        <div key={asset.id}>
                          <dt>{asset.title}</dt>
                          <dd>
                            {asset.license}
                          </dd>
                          <dd>
                            Approval {toSentenceCase(asset.approvalStatus)} · Provenance {toSentenceCase(asset.provenanceStatus)}
                          </dd>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </PageSection>
    </PageLayout>
  );
}
