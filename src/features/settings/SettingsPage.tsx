import { Link } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { usePersonalization } from '@/features/personalization/PersonalizationContext';
import { loadDailyPracticeClockOverride } from '@/features/practice/dailyPracticeClock';
import { loadDailyQuickAccessMiddleSlotId } from '@/features/practice/dailyQuickAccess';
import { useReadingSettings } from '@/features/settings/ReadingSettingsContext';
import { getSoundProfileById } from '@/features/timer/audioProfiles';
import { loadTimerPreferences, type TimerCueMode } from '@/features/timer/timerPreferences';
import { collectUserDataExport, formatUserDataMarkdown, createExportFilename, triggerDownload } from '@/features/settings/exportUserData';
import { collectUserDataBackup, triggerJsonBackupDownload } from '@/features/settings/backupUserData';
import { isStorageManagerSupported, estimateStorage, isPersistentStorageGranted, requestPersistentStorage } from '@/features/settings/storageHealth';
import { useCallback, useEffect, useState } from 'react';
import { appDb } from '@/lib/db';

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
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<string | null>(null);
  const [storageRequested, setStorageRequested] = useState(false);

  useEffect(() => {
    void isPersistentStorageGranted().then(setStoragePersisted);
    void estimateStorage().then((est) => {
      if (est) {
        setStorageEstimate(`${est.usageFormatted} / ${est.quotaFormatted} (${est.percentUsed}%)`);
      } else {
        setStorageEstimate(null);
      }
    });
  }, []);

  const handleExport = async () => {
    setExportStatus('Preparing export…');
    try {
      const data = await collectUserDataExport(appDb);
      const markdown = formatUserDataMarkdown(data);
      const filename = createExportFilename();
      triggerDownload(markdown, filename);
      setExportStatus('Export downloaded.');
    } catch {
      setExportStatus('Export failed. Try again.');
    }
  };

  const handleBackup = async () => {
    setBackupStatus('Preparing backup…');
    try {
      const backup = await collectUserDataBackup(appDb);
      triggerJsonBackupDownload(backup);
      setBackupStatus('Backup downloaded.');
    } catch {
      setBackupStatus('Backup failed. Try again.');
    }
  };

  const handleProtectStorage = useCallback(async () => {
    setStorageRequested(true);
    const result = await requestPersistentStorage();

    if (result === true) {
      setStoragePersisted(true);
    } else if (result === false) {
      setStoragePersisted(false);
    }
  }, []);

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

      <PageSection title="User Data">
        <p className="support-copy">
          Your notes, bookmarks, practice history, and settings are stored on this device.
          Browser storage is usually reliable, but it is not a substitute for backups.
          Use Export Markdown or JSON Backup to keep your own copy.
        </p>

        <div className="document-actions">
          <button
            className="primary-button"
            data-testid="export-markdown-button"
            disabled={exportStatus === 'Preparing export…'}
            onClick={() => {
              void handleExport();
            }}
            type="button"
          >
            {exportStatus === 'Preparing export…' ? 'Preparing…' : 'Export Markdown'}
          </button>
          <button
            className="secondary-button"
            data-testid="export-json-backup-button"
            disabled={backupStatus === 'Preparing backup…'}
            onClick={() => {
              void handleBackup();
            }}
            type="button"
          >
            {backupStatus === 'Preparing backup…' ? 'Preparing…' : 'Export JSON Backup'}
          </button>
        </div>

        {exportStatus ? <p className="support-copy">{exportStatus}</p> : null}
        {backupStatus ? <p className="support-copy">{backupStatus}</p> : null}

        <h3 className="dashboard-region__title">Storage</h3>
        {storagePersisted === true ? (
          <p className="support-copy">Persistent storage granted.</p>
        ) : storagePersisted === false ? (
          <p className="support-copy">Persistent storage not granted. Browser may clear data under storage pressure.</p>
        ) : null}

        {storageEstimate ? (
          <p className="support-copy">App data: {storageEstimate}</p>
        ) : null}

        {storagePersisted === false && !storageRequested ? (
          <button
            className="secondary-button"
            data-testid="protect-storage-button"
            onClick={() => {
              void handleProtectStorage();
            }}
            type="button"
          >
            Protect data on this device
          </button>
        ) : null}

        {storageRequested && storagePersisted === false ? (
          <p className="support-copy">Persistent storage was not granted by this browser.</p>
        ) : null}
      </PageSection>
    </PageLayout>
  );
}
