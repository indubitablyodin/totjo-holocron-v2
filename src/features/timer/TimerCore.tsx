import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { formatDuration, listAudioFiles } from '@/features/timer/audioFileManager';
import { loadTimerPreferences } from '@/features/timer/timerPreferences';
import { useTimerAudio } from '@/features/timer/useTimerAudio';
import { useTimerSession, type TimerCompletionEvent } from './useTimerSession';
import { TimerDurationPicker } from './TimerDurationPicker';
import { TimerControls } from './TimerControls';
import type { AudioFileRecord } from '@/lib/content';

export type TimerCoreProps = {
  mode?: 'compact' | 'full';
  defaultDurationMinutes?: number;
  source: 'daily-dashboard' | 'timer-page';
  onComplete?: (event: TimerCompletionEvent) => void | Promise<void>;
  onCue?: (cue: 'start' | 'pause' | 'resume' | 'complete') => void | Promise<void>;
};

export function TimerCore({
  mode = 'compact',
  defaultDurationMinutes = 15,
  onComplete,
  onCue,
}: TimerCoreProps) {
  const navigate = useNavigate();
  const [customMinutes, setCustomMinutes] = useState(20);
  const [showCustom, setShowCustom] = useState(false);
  const [audioFiles, setAudioFiles] = useState<AudioFileRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    void listAudioFiles().then((files) => {
      if (isMounted) {
        setAudioFiles(files);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
    handleConfigUpdate,
    completeNow,
  } = useTimerSession({
    defaultDurationMinutes,
    onComplete: async (event) => {
      await onComplete?.({
        ...event,
        ...(selectedGuidedAudio ? { guidedAudioName: selectedGuidedAudio.name } : {}),
      });
    },
    onCue: async (cue) => {
      const isGuided = session.kind === 'guided' && Boolean(session.guidedAudioFileId);

      await handleCue(cue, session.soundProfileId, {
        guided: isGuided,
        guidedCueOverlay: session.guidedCueOverlay,
      });

      await onCue?.(cue);
    },
  });

  const isGuidedMode = session.kind === 'guided';
  const canChangeConfig = isIdle || isComplete;

  const selectedGuidedAudio = audioFiles.find((file) => file.id === session.guidedAudioFileId) ?? null;

  const { handleCue } = useTimerAudio(session.soundProfileId, selectedGuidedAudio, completeNow);

  const handleModeChange = useCallback(
    (nextMode: 'timed' | 'guided') => {
      if (nextMode === 'timed') {
        handleConfigUpdate({ kind: 'timed' });
        return;
      }

      if (session.kind === 'guided' && session.guidedAudioFileId !== null) {
        return;
      }

      if (audioFiles.length === 0) {
        void navigate('/timer/guided-audio');
        return;
      }

      const defaultGuidedFileId = loadTimerPreferences().defaultGuidedAudioFileId;
      const guidedFile = defaultGuidedFileId ? audioFiles.find((file) => file.id === defaultGuidedFileId) : undefined;

      if (guidedFile) {
        handleConfigUpdate({ kind: 'guided', guidedAudioFileId: guidedFile.id });
        setDurationMinutes(Math.ceil(guidedFile.durationSeconds) / 60);
        return;
      }

      handleConfigUpdate({ kind: 'guided', guidedAudioFileId: null });
    },
    [audioFiles, handleConfigUpdate, navigate, session.guidedAudioFileId, session.kind, setDurationMinutes],
  );

  const handleGuidedAudioChange = useCallback(
    (fileId: string) => {
      if (fileId.length === 0) {
        handleConfigUpdate({ guidedAudioFileId: null });
        return;
      }

      const guidedFile = audioFiles.find((file) => file.id === fileId);
      handleConfigUpdate({ kind: 'guided', guidedAudioFileId: fileId });
      setDurationMinutes((guidedFile ? Math.ceil(guidedFile.durationSeconds) : session.totalDurationSeconds) / 60);
    },
    [audioFiles, handleConfigUpdate, session.totalDurationSeconds, setDurationMinutes],
  );

  const handleStartSession = useCallback(() => {
    if (isGuidedMode && !selectedGuidedAudio) {
      return;
    }

    if (isGuidedMode && selectedGuidedAudio) {
      handleStart(Math.ceil(selectedGuidedAudio.durationSeconds) / 60);
      return;
    }

    handleStart(session.totalDurationSeconds / 60);
  }, [handleStart, isGuidedMode, selectedGuidedAudio, session.totalDurationSeconds]);

  const isIdleOrComplete = isIdle || isComplete;

  return (
    <div className="dashboard-timer" data-testid="dashboard-meditation-timer">
      <div className="reader-option-group" data-testid="dashboard-timer-mode-toggle">
        <button
          aria-pressed={!isGuidedMode}
          className={`reader-option-button${!isGuidedMode ? ' reader-option-button--active' : ''}`}
          data-testid="dashboard-timer-mode-timed"
          disabled={!canChangeConfig}
          onClick={() => handleModeChange('timed')}
          type="button"
        >
          Timed
        </button>
        <button
          aria-pressed={isGuidedMode}
          className={`reader-option-button${isGuidedMode ? ' reader-option-button--active' : ''}`}
          data-testid="dashboard-timer-mode-guided"
          disabled={!canChangeConfig}
          onClick={() => handleModeChange('guided')}
          type="button"
        >
          Guided
        </button>
      </div>

      {isGuidedMode ? (
        <div className="guided-audio-select-block" data-testid="dashboard-guided-audio-block">
          <label className="guided-audio-select-label" htmlFor="dashboard-guided-audio-select">
            <span className="field-help">Guided audio</span>
            <select
              className="field-select"
              data-testid="dashboard-guided-audio-select"
              disabled={!canChangeConfig}
              id="dashboard-guided-audio-select"
              onChange={(event) => {
                handleGuidedAudioChange(event.target.value);
              }}
              value={session.guidedAudioFileId ?? ''}
            >
              <option value="">Select an audio file…</option>
              {audioFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
          </label>

          <p className="support-copy">
            {selectedGuidedAudio
              ? `Duration locked to ${selectedGuidedAudio.name} (${formatDuration(selectedGuidedAudio.durationSeconds)}).`
              : 'Duration locks to the length of the audio file.'}{' '}
            <Link to="/timer/guided-audio">Manage audio</Link>
          </p>
        </div>
      ) : null}

      {isIdleOrComplete ? (
        isGuidedMode ? (
          <button
            className="primary-button"
            data-testid="dashboard-timer-start-guided"
            disabled={!selectedGuidedAudio}
            onClick={handleStartSession}
            type="button"
          >
            Start guided session
          </button>
        ) : (
          <TimerDurationPicker
            customMinutes={customMinutes}
            showCustom={showCustom}
            onCustomMinutesChange={setCustomMinutes}
            onShowCustomChange={setShowCustom}
            onStart={handleStart}
          />
        )
      ) : (
        <div className="dashboard-timer__readout" data-testid="timer-readout">
          {clockDisplay}
        </div>
      )}

      {isRunning || isPaused ? (
        <TimerControls
          isRunning={isRunning}
          isPaused={isPaused}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
      ) : null}

      {isComplete ? (
        <p className="support-copy timer-complete-message" data-testid="timer-complete">
          Session complete.
        </p>
      ) : null}

      {mode === 'full' ? (
        <details className="timer-session-details">
          <summary>Session details</summary>
          <dl className="detail-list">
            <div>
              <dt>Duration</dt>
              <dd>{session.totalDurationSeconds}s</dd>
            </div>
            <div>
              <dt>Phase</dt>
              <dd>{session.phase}</dd>
            </div>
          </dl>
        </details>
      ) : null}
    </div>
  );
}
