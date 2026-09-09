import { useCallback, useEffect, useRef } from 'react';
import {
  getSoundProfileById,
  type CueKind,
  type SoundProfileId,
} from '@/features/timer/audioProfiles';
import type { AudioFileRecord } from '@/lib/content';

export type TimerAudioStatus = 'ready' | 'silent' | 'unavailable';

export function useTimerAudio(
  soundProfileId: SoundProfileId,
  guidedAudioFile?: AudioFileRecord | null,
  onGuidedEnded?: () => void,
) {
  const audioElementsRef = useRef<Partial<Record<CueKind, HTMLAudioElement>>>({});
  const guidedAudioRef = useRef<HTMLAudioElement | null>(null);
  const guidedAudioUrlRef = useRef<string | null>(null);
  const onGuidedEndedRef = useRef(onGuidedEnded);

  useEffect(() => {
    onGuidedEndedRef.current = onGuidedEnded;
  }, [onGuidedEnded]);

  const audioStatus: TimerAudioStatus = (() => {
    const profile = getSoundProfileById(soundProfileId);
    if (profile.id === 'silent') return 'silent';
    return typeof Audio === 'undefined' ? 'unavailable' : 'ready';
  })();

  useEffect(() => {
    const profile = getSoundProfileById(soundProfileId);

    if (profile.id === 'silent' || typeof Audio === 'undefined') {
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
        if (!audio) return;
        audio.pause();
        audio.src = '';
      });
    };
  }, [soundProfileId]);

  const handleGuidedEnded = useCallback(() => {
    onGuidedEndedRef.current?.();
  }, []);

  useEffect(() => {
    if (guidedAudioRef.current) {
      guidedAudioRef.current.removeEventListener('ended', handleGuidedEnded);
      guidedAudioRef.current.pause();
      guidedAudioRef.current.removeAttribute('src');
      guidedAudioRef.current.load();
      guidedAudioRef.current = null;
    }

    if (guidedAudioUrlRef.current) {
      URL.revokeObjectURL(guidedAudioUrlRef.current);
      guidedAudioUrlRef.current = null;
    }

    if (guidedAudioFile) {
      const url = URL.createObjectURL(guidedAudioFile.blob);
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.addEventListener('ended', handleGuidedEnded);
      audio.load();
      guidedAudioRef.current = audio;
      guidedAudioUrlRef.current = url;
    }

    return () => {
      if (guidedAudioRef.current) {
        guidedAudioRef.current.removeEventListener('ended', handleGuidedEnded);
        guidedAudioRef.current.pause();
        guidedAudioRef.current.removeAttribute('src');
        guidedAudioRef.current.load();
        guidedAudioRef.current = null;
      }

      if (guidedAudioUrlRef.current) {
        URL.revokeObjectURL(guidedAudioUrlRef.current);
        guidedAudioUrlRef.current = null;
      }
    };
  }, [guidedAudioFile, handleGuidedEnded]);

  const playCue = useCallback(async (cueKind: CueKind, profileId: SoundProfileId) => {
    const profile = getSoundProfileById(profileId);

    if (profile.id === 'silent') {
      return;
    }

    const audio = audioElementsRef.current[cueKind];

    if (!audio) {
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // Audio playback blocked or unavailable — timer continues without sound.
    }
  }, []);

  const primeAudio = useCallback((profileId: SoundProfileId) => {
    const profile = getSoundProfileById(profileId);

    if (profile.id === 'silent' || typeof Audio === 'undefined') {
      return;
    }

    const audio = audioElementsRef.current['start'];

    if (!audio) {
      return;
    }

    // Browsers may block audio without user gesture. Playing a very short
    // silent buffer unlocks the AudioContext for later playback.
    try {
      audio.currentTime = 0;
      void audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    } catch {
      // Ignore.
    }
  }, []);

  const playGuidedAudio = useCallback(async () => {
    if (!guidedAudioRef.current) return;

    try {
      guidedAudioRef.current.currentTime = 0;
      await guidedAudioRef.current.play();
    } catch {
      // Autoplay blocked — timer continues without guided audio.
    }
  }, []);

  const pauseGuidedAudio = useCallback(() => {
    if (!guidedAudioRef.current) return;
    guidedAudioRef.current.pause();
  }, []);

  const resumeGuidedAudio = useCallback(async () => {
    if (!guidedAudioRef.current) return;

    try {
      await guidedAudioRef.current.play();
    } catch {
      // Ignore.
    }
  }, []);

  const stopGuidedAudio = useCallback(() => {
    if (!guidedAudioRef.current) return;
    guidedAudioRef.current.pause();
    guidedAudioRef.current.currentTime = 0;
  }, []);

  const handleCue = useCallback(
    async (
      cue: 'start' | 'pause' | 'resume' | 'complete',
      profileId: SoundProfileId,
      options?: { guided?: boolean; guidedCueOverlay?: boolean },
    ) => {
      const isGuided = options?.guided ?? false;
      const overlayBells = options?.guidedCueOverlay ?? true;

      if (cue === 'start') {
        primeAudio(profileId);

        if (isGuided) {
          await playGuidedAudio();
        }

        if (!isGuided || overlayBells) {
          await playCue('start', profileId);
        }
      }

      if (cue === 'pause' && isGuided) {
        pauseGuidedAudio();
      }

      if (cue === 'resume' && isGuided) {
        await resumeGuidedAudio();
      }

      if (cue === 'complete') {
        if (isGuided) {
          stopGuidedAudio();
        }

        if (!isGuided || overlayBells) {
          await playCue('complete', profileId);
        }
      }
    },
    [playCue, primeAudio, playGuidedAudio, pauseGuidedAudio, resumeGuidedAudio, stopGuidedAudio],
  );

  return {
    audioStatus,
    handleCue,
    primeAudio,
    playCue,
    playGuidedAudio,
    pauseGuidedAudio,
    resumeGuidedAudio,
    stopGuidedAudio,
  };
}
