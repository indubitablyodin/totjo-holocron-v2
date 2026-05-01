import audioRightsPolicy from '../../../content/policy/audio-rights.json';

import type { ApprovalStatus, ProvenanceStatus } from '@/lib/content';

export const SOUND_PROFILE_OPTIONS = ['silent', 'default-gong'] as const;

export type SoundProfileId = (typeof SOUND_PROFILE_OPTIONS)[number];
export type CueKind = 'start' | 'interval' | 'complete';

type AudioRightsAssetFile = {
  cue: CueKind;
  path: string;
};

export type AudioRightsAsset = {
  id: string;
  title: string;
  attribution: string;
  approvalStatus: ApprovalStatus;
  provenanceStatus: ProvenanceStatus;
  license: string;
  licenseUrl?: string;
  provenance: string;
  sourceUrls: string[];
  files: AudioRightsAssetFile[];
  notes?: string;
};

export type SoundProfile = {
  id: SoundProfileId;
  label: string;
  description: string;
  cuePaths: Partial<Record<CueKind, string>>;
  rightsAsset: AudioRightsAsset | null;
};

const bundledAudioRightsAssets = audioRightsPolicy.assets as AudioRightsAsset[];
const validSoundProfileIds = new Set<SoundProfileId>(SOUND_PROFILE_OPTIONS);
const defaultGongRightsAsset = bundledAudioRightsAssets.find((asset) => asset.id === 'default-gong');

if (!defaultGongRightsAsset) {
  throw new Error('Missing default-gong rights metadata in content/policy/audio-rights.json');
}

export const DEFAULT_SOUND_PROFILE_ID: SoundProfileId = 'default-gong';

export const SOUND_PROFILES: SoundProfile[] = [
  {
    id: 'silent',
    label: 'Silent',
    description: 'Runs the meditation timer without any cue audio.',
    cuePaths: {},
    rightsAsset: null,
  },
  {
    id: 'default-gong',
    label: 'Meditation bowl gong',
    description: 'Short bundled bowl-gong cues for opening, optional reminders, and completion.',
    cuePaths: {
      start: '/audio/default-gong-start.mp3',
      interval: '/audio/default-gong-interval.mp3',
      complete: '/audio/default-gong-complete.mp3',
    },
    rightsAsset: defaultGongRightsAsset,
  },
];

export function isSoundProfileId(value: unknown): value is SoundProfileId {
  return typeof value === 'string' && validSoundProfileIds.has(value as SoundProfileId);
}

export function getSoundProfileById(id: SoundProfileId): SoundProfile {
  return SOUND_PROFILES.find((profile) => profile.id === id) ?? SOUND_PROFILES[0];
}

export function getBundledAudioRightsAssets(): AudioRightsAsset[] {
  return bundledAudioRightsAssets;
}

export function getCueKindLabel(cueKind: CueKind): string {
  switch (cueKind) {
    case 'start':
      return 'Start';
    case 'interval':
      return 'Interval';
    case 'complete':
      return 'Complete';
  }
}
