import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

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
  applyEditableTimerConfig,
  advanceTimerSession,
  formatTimerClock,
  pauseTimerSession,
  resumeTimerSession,
  startTimerSession,
  shouldPlayTimerCue,
  type TimerSessionState,
} from '@/features/timer/timerModel';
import { type TimerCueMode } from '@/features/timer/timerPreferences';
import { listMeditationPracticeHistory, recordMeditationPractice } from '@/features/timer/timerHistory';

type AudioStatus = 'ready' | 'silent' | 'unavailable';

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
  const [session, setSession] = useState<TimerSessionState>(() => loadTimerSession());
  const [lastCueMessage, setLastCueMessage] = useState('No cue has played yet.');
  const [historyEntries, setHistoryEntries] = useState<Array<{ id: string; completedAt: string; durationSeconds: number }>>([]);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [showTimerDetails, setShowTimerDetails] = useState(false);
  const sessionRef = useRef(session);
  const bundledAudioRightsAssets = useMemo(() => getBundledAudioRightsAssets(), []);
  const { audioElementsRef, audioStatus } = useAudioElements(session.soundProfileId);

  useEffect(() => {
    sessionRef.current = session;
    saveTimerSession(session);
  }, [session]);

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
        // Some browsers block programmatic playback outside a gesture. Keep the cue state visible anyway.
      }

      setLastCueMessage(`${getCueKindLabel(cueKind)} cue armed with ${profile.label}.`);
    },
    [audioElementsRef],
  );

  const persistCompletion = useCallback(
    async (completedSession: TimerSessionState) => {
      if (completedSession.historyRecorded || !completedSession.recordPracticeHistory) {
        return;
      }

      await recordMeditationPractice({
        completedAt: new Date(completedSession.completedAtMs ?? Date.now()).toISOString(),
        durationSeconds: completedSession.totalDurationSeconds,
      });

      setSession((currentSession) => {
        if (currentSession.historyRecorded) {
          return currentSession;
        }

        return {
          ...currentSession,
          historyRecorded: true,
        };
      });

      await refreshHistory();
    },
    [refreshHistory],
  );

  useEffect(() => {
    if (session.phase !== 'running') {
      return;
    }

    const syncTimer = () => {
      const currentSession = sessionRef.current;
      const result = advanceTimerSession(currentSession, Date.now());

      if (!result.changed && result.cueKind === null && !result.didComplete) {
        return;
      }

      setSession(result.session);

      if (result.cueKind) {
        void playCue(result.cueKind, result.session.soundProfileId);
      }

      if (result.didComplete) {
        void persistCompletion(result.session);
      }
    };

    syncTimer();

    const intervalId = window.setInterval(syncTimer, 250);
    const handleVisibilitySync = () => {
      syncTimer();
    };

    window.addEventListener('focus', handleVisibilitySync);
    document.addEventListener('visibilitychange', handleVisibilitySync);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilitySync);
      document.removeEventListener('visibilitychange', handleVisibilitySync);
    };
  }, [persistCompletion, playCue, session.phase]);

  const canEditSession = session.phase === 'idle' || session.phase === 'complete';
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
      description="Keep the live session in reach and tuck the setup details away until you want them."
      eyebrow="Meditation timer"
      title="Timer"
    >
      <PageSection
        description="The live timer stays first. Session setup stays close by without crowding the clock."
        title="Start a session"
      >
        <div className="timer-grid">
          <section className="content-section timer-display timer-display--hero" data-testid="timer-panel">
            <div className="timer-readout">
              <p className="metric-label">Remaining</p>
              <p className="timer-clock" data-testid="timer-remaining">
                {formatTimerClock(session.remainingSeconds)}
              </p>
              <p className="support-copy">Pause or reset stays here while the timer runs. You can change the session again when it stops.</p>
              <p className="status-pill" data-testid="timer-status">
                {timerStatusLabel}
              </p>
            </div>

            <div className="timer-controls">
              {(session.phase === 'idle' || session.phase === 'complete') && (
                <button
                  className="primary-button"
                  data-testid="timer-start"
                    onClick={() => {
                      const nextSession = startTimerSession(sessionRef.current, Date.now());
                      setShowSessionSettings(false);
                      setSession(nextSession);
                      if (shouldPlayTimerCue(nextSession, 'start')) {
                        void playCue('start', nextSession.soundProfileId);
                      }
                    }}
                  type="button"
                >
                  Start timer
                </button>
              )}

              {session.phase === 'running' && (
                <button
                  className="primary-button"
                  data-testid="timer-pause"
                  onClick={() => {
                    const currentSession = advanceTimerSession(sessionRef.current, Date.now()).session;
                    const nextSession = pauseTimerSession(currentSession, Date.now());
                    setSession(nextSession);
                    setLastCueMessage('Timer paused.');
                  }}
                  type="button"
                >
                  Pause timer
                </button>
              )}

              {session.phase === 'paused' && (
                <button
                  className="primary-button"
                  data-testid="timer-resume"
                    onClick={() => {
                      const nextSession = resumeTimerSession(sessionRef.current, Date.now());
                      setShowSessionSettings(false);
                      setSession(nextSession);
                      if (shouldPlayTimerCue(nextSession, 'start')) {
                        void playCue('start', nextSession.soundProfileId);
                      }
                    }}
                  type="button"
                >
                  Resume timer
                </button>
              )}

              <button
                className="secondary-button"
                data-testid="timer-reset"
                onClick={() => {
                  clearTimerSessionStorage();
                  setSession(loadTimerSession());
                  setLastCueMessage('Timer reset and ready for a new session.');
                }}
                type="button"
              >
                Reset session
              </button>
            </div>

            <div className="panel-toggle-block">
              <div className="button-row">
                <button
                  aria-expanded={showSessionSettings}
                  className="secondary-button button-inline"
                  data-testid="timer-settings-toggle"
                  onClick={() => {
                    setShowSessionSettings((currentValue) => !currentValue);
                  }}
                  type="button"
                >
                  {showSessionSettings ? 'Hide session setup' : 'Session setup'}
                </button>

                <Link className="secondary-button button-inline" to="/settings/timer-defaults">
                  Timer defaults in Settings
                </Link>
              </div>

              {showSessionSettings ? (
                <form className="settings-form timer-config timer-config--compact panel-toggle-body" data-testid="timer-defaults" onSubmit={(event) => event.preventDefault()}>
                  <div className="timer-config__intro">
                    <p className="field-label">Session setup</p>
                    <p className="field-help">Change this session here. Durable timer defaults still live in Settings.</p>
                  </div>

                  <label className="field-card" htmlFor="timer-duration-seconds">
                    <span className="field-label">Total duration</span>
                    <span className="field-help">Set the full session length in seconds.</span>
                    <input
                      className="field-select"
                      data-testid="timer-duration-seconds"
                      disabled={!canEditSession}
                      id="timer-duration-seconds"
                      inputMode="numeric"
                      min={1}
                      onChange={(event) => {
                        setSession((currentSession) =>
                          applyEditableTimerConfig(currentSession, {
                            totalDurationSeconds: event.target.value,
                          }),
                        );
                      }}
                      type="number"
                      value={session.totalDurationSeconds}
                    />
                  </label>

                  <label className="field-card" htmlFor="timer-cue-mode">
                    <span className="field-label">Bell mode</span>
                    <span className="field-help">Choose whether the bowl rings at the beginning, the end, both, or on a custom spacing.</span>
                    <select
                      className="field-select"
                      data-testid="timer-cue-mode"
                      disabled={!canEditSession}
                      id="timer-cue-mode"
                      onChange={(event) => {
                        const nextCueMode = event.target.value as TimerCueMode;
                        setSession((currentSession) =>
                          applyEditableTimerConfig(currentSession, {
                            cueMode: nextCueMode,
                            intervalSeconds: nextCueMode === 'custom' && currentSession.intervalSeconds === 0 ? 60 : currentSession.intervalSeconds,
                          }),
                        );
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
                    <label className="field-card" htmlFor="timer-interval-seconds">
                      <span className="field-label">Ring every</span>
                      <span className="field-help">Play a bowl strike this many seconds apart while the timer is running.</span>
                      <input
                        className="field-select"
                        data-testid="timer-interval-seconds"
                        disabled={!canEditSession}
                        id="timer-interval-seconds"
                        inputMode="numeric"
                        min={1}
                        onChange={(event) => {
                          setSession((currentSession) =>
                            applyEditableTimerConfig(currentSession, {
                              intervalSeconds: event.target.value,
                            }),
                          );
                        }}
                        type="number"
                        value={session.intervalSeconds}
                      />
                    </label>
                  ) : null}

                  <label className="field-card" htmlFor="timer-sound-profile">
                    <span className="field-label">Bell sound</span>
                    <span className="field-help">Choose the sound this session should use for opening, reminder, and closing bells.</span>
                    <select
                      className="field-select"
                      data-testid="timer-sound-profile"
                      disabled={!canEditSession}
                      id="timer-sound-profile"
                      onChange={(event) => {
                        setSession((currentSession) =>
                          applyEditableTimerConfig(currentSession, {
                            soundProfileId: event.target.value as SoundProfileId,
                          }),
                        );
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

                  <label className="field-card field-card--toggle" htmlFor="timer-record-history">
                    <span className="field-label">Save session history</span>
                    <span className="field-help">Save completed sessions on this device.</span>
                    <span className="filter-toggle timer-checkbox">
                      <input
                        checked={session.recordPracticeHistory}
                        data-testid="timer-record-history"
                        disabled={!canEditSession}
                        id="timer-record-history"
                        onChange={(event) => {
                          setSession((currentSession) =>
                            applyEditableTimerConfig(currentSession, {
                              recordPracticeHistory: event.target.checked,
                            }),
                          );
                        }}
                        type="checkbox"
                      />
                      Save completed sessions on this device
                    </span>
                  </label>
                </form>
              ) : null}
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
