import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { usePersonalization } from '@/features/personalization/PersonalizationContext';
import { loadDailyPracticeClockOverride } from '@/features/practice/dailyPracticeClock';
import { loadDailyQuickAccessMiddleSlotId } from '@/features/practice/dailyQuickAccess';
import { useReadingSettings } from '@/features/settings/ReadingSettingsContext';
import { getSoundProfileById } from '@/features/timer/audioProfiles';
import { loadTimerPreferences, type TimerCueMode } from '@/features/timer/timerPreferences';

const FONT_SCALE_LABELS = {
  compact: 'Compact',
  standard: 'Standard',
  large: 'Large',
} as const;

const THEME_LABELS = {
  dark: 'Dark',
  light: 'Light',
} as const;

const PRONOUN_MODE_SUMMARY = {
  he: 'he/him saved',
  she: 'she/her saved',
  they: 'they/them saved',
} as const;

const TIMER_CUE_MODE_SUMMARY: Record<TimerCueMode, string> = {
  'start-end': 'Beginning and end',
  'start-only': 'Beginning only',
  'end-only': 'End only',
  custom: 'Custom spacing',
};

type SettingsIndexLinkProps = {
  actionLabel: string;
  description: string;
  summary: string;
  testId: string;
  title: string;
  to: string;
};

function SettingsIndexLink({ actionLabel, description, summary, testId, title, to }: SettingsIndexLinkProps) {
  return (
    <Link className="settings-link-card" data-testid={testId} to={to}>
      <div className="settings-link-card__content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <p className="settings-link-card__summary">{summary}</p>
      <span className="settings-link-card__action">{actionLabel}</span>
    </Link>
  );
}

export function SettingsPage() {
  const { settings } = useReadingSettings();
  const { pronounMode } = usePersonalization();
  const timerPreferences = loadTimerPreferences();
  const focusClockOverride = loadDailyPracticeClockOverride();
  const focusQuickAccessSlotId = loadDailyQuickAccessMiddleSlotId();
  const readingSummary = `${FONT_SCALE_LABELS[settings.fontScale]} type · ${THEME_LABELS[settings.theme]} theme · ${PRONOUN_MODE_SUMMARY[pronounMode]}`;
  const timerSummary = `${timerPreferences.defaultDurationSeconds}s default · ${TIMER_CUE_MODE_SUMMARY[timerPreferences.defaultCueMode]}${timerPreferences.defaultCueMode === 'custom' ? ` · every ${timerPreferences.defaultIntervalSeconds}s` : ''} · ${getSoundProfileById(timerPreferences.defaultSoundProfileId).label}`;
  const focusSummary = `${focusClockOverride.enabled ? `Manual clock · ${focusClockOverride.timeZone || 'device time zone'}` : 'Device clock'} · ${focusQuickAccessSlotId ? 'Custom shortcut' : 'No shortcut'}`;

  return (
    <PageLayout
      description="Change the local reading, timer, and app information settings that belong to this device."
      eyebrow="Settings"
      title="Settings"
    >
      <PageSection description="This release is private and local-only; personal notes, bookmarks, and practice state stay in this browser." title="Choose a settings area">
        <div className="settings-index" data-testid="settings-index">
          <SettingsIndexLink
            actionLabel="Open reading defaults"
            description="Change theme, type size, contrast, and pronoun preference."
            summary={readingSummary}
            testId="settings-group-reading-display"
            title="Reading & Display"
            to="/settings/reading-display"
          />
          <SettingsIndexLink
            actionLabel="Open focus settings"
            description="Adjust the manual local time and Daily Focus quick-access slot."
            summary={focusSummary}
            testId="settings-group-focus-practice"
            title="Focus & Practice"
            to="/settings/focus-practice"
          />
          <SettingsIndexLink
            actionLabel="Open timer defaults"
            description="Set how each new timer begins."
            summary={timerSummary}
            testId="settings-group-timer-defaults"
            title="Timer Defaults"
            to="/settings/timer-defaults"
          />
          <SettingsIndexLink
            actionLabel="Open app details"
            description="Read local privacy notes, sound rights, and legal terms."
            summary="Local-only privacy and app details"
            testId="settings-group-about-legal"
            title="About & Legal"
            to="/settings/about-legal"
          />
        </div>
      </PageSection>
    </PageLayout>
  );
}
