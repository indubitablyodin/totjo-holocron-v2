import { useCallback, useEffect, useRef } from 'react';
import {
  getSoundProfileById,
  type CueKind,
  type SoundProfileId,
} from '@/features/timer/audioProfiles';

export type TimerAudioStatus = 'ready' | 'silent' | 'unavailable';

export function useTimerAudio(soundProfileId: SoundProfileId) {
  const audioElementsRef = useRef<Partial<Record<CueKind, HTMLAudioElement>>>({});

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

  const handleCue = useCallback(async (cue: 'start' | 'pause' | 'resume' | 'complete', profileId: SoundProfileId) => {
    if (cue === 'start') {
      primeAudio(profileId);
    }
    if (cue === 'complete' || cue === 'start') {
      const cueKind: CueKind = cue === 'start' ? 'start' : 'complete';
      await playCue(cueKind, profileId);
    }
  }, [playCue, primeAudio]);

  return { audioStatus, handleCue, primeAudio, playCue };
}
