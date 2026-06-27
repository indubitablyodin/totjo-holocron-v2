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
import {
  loadLastUserDataExport,
  saveLastUserDataExport,
  getBackupFreshnessStatus,
  type FreshnessStatus,
} from '@/features/settings/backupFreshness';
import {
  parseUserDataBackupJson,
  validateUserDataBackup,
  createUserDataRestorePreview,
  type RestorePreviewV1,
} from '@/features/settings/restoreUserData';
import { useCallback, useEffect, useRef, useState } from 'react';
import { appDb } from '@/lib/db';

const FONT_SCALE_LABELS = {
  compact: 'Compact',
  standard: 'Standard',
  large: 'Large',
} as const;

const THEME_LABELS = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
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
  const [freshnessStatus, setFreshnessStatus] = useState<FreshnessStatus>('none-needed');
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreviewV1 | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFreshness = useCallback(async () => {
    const lastExport = loadLastUserDataExport();
    const [notes, bookmarks, practiceHistory] = await Promise.all([
      appDb.notes.count(),
      appDb.bookmarks.count(),
      appDb.practiceHistory.count(),
    ]);
    const hasData = notes > 0 || bookmarks > 0 || practiceHistory > 0;

    setFreshnessStatus(getBackupFreshnessStatus(lastExport, new Date(), hasData));

    if (lastExport) {
      const d = new Date(lastExport.lastExportedAt);
      setLastExportDate(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    } else {
      setLastExportDate(null);
    }
  }, []);

  useEffect(() => {
    void isPersistentStorageGranted().then(setStoragePersisted);
    void estimateStorage().then((est) => {
      if (est) {
        setStorageEstimate(`${est.usageFormatted} / ${est.quotaFormatted} (${est.percentUsed}%)`);
      } else {
        setStorageEstimate(null);
      }
    });
    void updateFreshness();
  }, [updateFreshness]);

  const handleExport = async () => {
    setExportStatus('Preparing export…');
    try {
      const data = await collectUserDataExport(appDb);
      const markdown = formatUserDataMarkdown(data);
      const filename = createExportFilename();
      triggerDownload(markdown, filename);
      saveLastUserDataExport('markdown', new Date());
      setExportStatus('Export downloaded.');
      void updateFreshness();
    } catch {
      setExportStatus('Export failed. Try again.');
    }
  };

  const handleBackup = async () => {
    setBackupStatus('Preparing backup…');
    try {
      const backup = await collectUserDataBackup(appDb);
      triggerJsonBackupDownload(backup);
      saveLastUserDataExport('json', new Date());
      setBackupStatus('Backup downloaded.');
      void updateFreshness();
    } catch {
      setBackupStatus('Backup failed. Try again.');
    }
  };

  const handleRestorePreview = useCallback(async (file: File) => {
    setRestorePreview(null);
    setRestoreError(null);

    try {
      const text = await file.text();
      const parsed = parseUserDataBackupJson(text);

      if (!parsed) {
        setRestoreError('This backup could not be previewed. Make sure it is a TOTJO Holocron JSON backup.');
        return;
      }

      const validated = validateUserDataBackup(parsed);

      if (!validated) {
        setRestoreError('This backup could not be previewed. Make sure it is a TOTJO Holocron JSON backup.');
        return;
      }

      const [notes, bookmarks, practiceHistory, downloads] = await Promise.all([
        appDb.notes.toArray(),
        appDb.bookmarks.toArray(),
        appDb.practiceHistory.toArray(),
        appDb.downloads.toArray(),
      ]);

      const preview = createUserDataRestorePreview(validated, { notes, bookmarks, practiceHistory, downloads });
      setRestorePreview(preview);
    } catch {
      setRestoreError('This backup could not be previewed. Make sure it is a TOTJO Holocron JSON backup.');
    }
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      void handleRestorePreview(file);
    }
  }, [handleRestorePreview]);

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

        {freshnessStatus === 'never-backed-up' ? (
          <p className="support-copy" data-testid="freshness-never-backed-up">
            No backup recorded on this device yet. Export Markdown or JSON Backup to keep your own copy.
          </p>
        ) : null}

        {freshnessStatus === 'fresh' && lastExportDate ? (
          <p className="support-copy" data-testid="freshness-fresh">
            Last backup: {lastExportDate}. Keep exporting periodically if you add important notes.
          </p>
        ) : null}

        {freshnessStatus === 'stale' && lastExportDate ? (
          <p className="support-copy" data-testid="freshness-stale">
            Last backup: {lastExportDate}. Consider exporting a fresh backup.
          </p>
        ) : null}

        {freshnessStatus === 'unknown' ? (
          <p className="support-copy" data-testid="freshness-unknown">
            Backup status unavailable. Export a fresh backup to update this status.
          </p>
        ) : null}

        <h3 className="dashboard-region__title">Restore</h3>
        <p className="support-copy">
          Preview a JSON backup before restoring. No data will be changed.
        </p>

        <label className="secondary-button button-inline" data-testid="restore-preview-label" style={{ cursor: 'pointer', display: 'inline-flex' }}>
          Preview JSON Restore
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            data-testid="restore-file-input"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </label>

        {restoreError ? (
          <p className="surface-error" role="alert" data-testid="restore-preview-error">
            {restoreError}
          </p>
        ) : null}

        {restorePreview ? (
          <div className="restore-preview" data-testid="restore-preview" aria-live="polite">
            <p className="support-copy">
              Backup exported: {new Date(restorePreview.backupExportedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="support-copy">This is a preview only. No data has been changed.</p>
            <dl className="detail-list">
              <div>
                <dt>Notes to add</dt>
                <dd>{restorePreview.counts.notesToAdd}</dd>
              </div>
              <div>
                <dt>Notes to update</dt>
                <dd>{restorePreview.counts.notesToUpdate}</dd>
              </div>
              <div>
                <dt>Bookmarks to add</dt>
                <dd>{restorePreview.counts.bookmarksToAdd}</dd>
              </div>
              <div>
                <dt>Practice records to add</dt>
                <dd>{restorePreview.counts.practiceHistoryToAdd}</dd>
              </div>
              <div>
                <dt>Sermon downloads</dt>
                <dd>{restorePreview.counts.downloadsToAdd}</dd>
              </div>
              <div>
                <dt>Settings available</dt>
                <dd>{restorePreview.counts.settingsAvailable}</dd>
              </div>
              <div>
                <dt>Skipped records</dt>
                <dd>{restorePreview.counts.skipped}</dd>
              </div>
            </dl>
            {restorePreview.warnings.length > 0 ? (
              <div>
                <p className="field-label">Warnings</p>
                <ul>
                  {restorePreview.warnings.map((w, i) => (
                    <li key={i} className="support-copy">{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

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
