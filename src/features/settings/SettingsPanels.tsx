import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SaveToast, useSaveToast } from '@/features/settings/SaveToast';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { usePersonalization } from '@/features/personalization/PersonalizationContext';
import { PRONOUN_MODE_OPTIONS } from '@/features/personalization/personalizationRules';
import {
  DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE,
  formatDailyPracticeClockInputValue,
  loadDailyPracticeClockOverride,
  saveDailyPracticeClockOverride,
  type DailyPracticeClockOverride,
} from '@/features/practice/dailyPracticeClock';
import {
  createDailyQuickAccessChoices,
  loadDailyQuickAccessMiddleSlotId,
  saveDailyQuickAccessMiddleSlot,
  type DailyQuickAccessChoice,
} from '@/features/practice/dailyQuickAccess';
import { useReadingSettings } from '@/features/settings/ReadingSettingsContext';
import { CONTRAST_OPTIONS, FONT_SCALE_OPTIONS, THEME_OPTIONS } from '@/features/settings/readingSettings';
import { getAppAssetPath } from '@/lib/appAssets';
import { getBundledAudioRightsAssets, SOUND_PROFILES, type AudioRightsAsset } from '@/features/timer/audioProfiles';
import { appDb, ensureStorageReady } from '@/lib/db';
import {
  clampTimerDurationPreference,
  clampTimerIntervalPreference,
  clearTimerPreferencesStorage,
  DEFAULT_TIMER_PREFERENCES,
  TIMER_CUE_MODES,
  loadTimerPreferences,
  saveTimerPreferences,
  type TimerCueMode,
  type TimerPreferences,
} from '@/features/timer/timerPreferences';

const TIMER_CUE_MODE_LABELS: Record<TimerCueMode, string> = {
  'start-end': 'Beginning and end',
  'start-only': 'Beginning only',
  'end-only': 'End only',
  custom: 'Custom spacing',
};

const FONT_SCALE_LABELS = {
  compact: 'Compact',
  standard: 'Standard',
  large: 'Large',
} as const;

const THEME_LABELS = {
  dark: 'Dark',
  light: 'Light',
} as const;

const CONTRAST_LABELS = {
  standard: 'Standard',
  high: 'High',
} as const;

const PRONOUN_MODE_LABELS = {
  he: 'he/him',
  she: 'she/her',
  they: 'they/them',
} as const;

function toSentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

function renderAudioRightsSources(asset: AudioRightsAsset) {
  return (
    <ul className="source-list">
      {asset.sourceUrls.map((sourceUrl) => (
        <li key={sourceUrl}>
          <a href={sourceUrl}>{sourceUrl}</a>
        </li>
      ))}
    </ul>
  );
}

function SettingsBackLink() {
  return (
    <Link className="secondary-button button-inline" to="/settings">
      Back to settings
    </Link>
  );
}

export function ReadingDisplaySettingsPage() {
  const { settings, updateContrast, updateFontScale, updateTheme, resetSettings } = useReadingSettings();
  const { pronounMode, updatePronounMode } = usePersonalization();
  const { showToast, trigger } = useSaveToast();

    return (
      <PageLayout
      description="Change text size, theme, contrast, and pronoun settings here."
      eyebrow="Settings"
      headerBadge={<SettingsBackLink />}
      title="Reading & Display"
    >
      <SaveToast visible={showToast} />
      <PageSection
        description="These settings stay in place until you update them."
        title="Reading defaults"
      >
        <form className="settings-form" onChange={trigger}>
          <label className="field-card" htmlFor="setting-font-scale">
            <span className="field-label">Type size</span>
            <span className="field-help">Set the text size reading pages should open with.</span>
            <select
              className="field-select"
              data-testid="setting-font-scale"
              id="setting-font-scale"
              onChange={(event) => {
                updateFontScale(event.target.value as (typeof FONT_SCALE_OPTIONS)[number]);
              }}
              value={settings.fontScale}
            >
              {FONT_SCALE_OPTIONS.map((fontScale) => (
                <option key={fontScale} value={fontScale}>
                  {FONT_SCALE_LABELS[fontScale]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-card" htmlFor="setting-theme">
            <span className="field-label">Theme</span>
            <span className="field-help">Switch between the darker study theme and a brighter daytime view.</span>
            <select
              className="field-select"
              data-testid="setting-theme"
              id="setting-theme"
              onChange={(event) => {
                updateTheme(event.target.value as (typeof THEME_OPTIONS)[number]);
              }}
              value={settings.theme}
            >
              {THEME_OPTIONS.map((theme) => (
                <option key={theme} value={theme}>
                  {THEME_LABELS[theme]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-card" htmlFor="setting-contrast">
            <span className="field-label">Contrast</span>
            <span className="field-help">Increase separation between text and background for stronger readability.</span>
            <select
              className="field-select"
              data-testid="setting-contrast"
              id="setting-contrast"
              onChange={(event) => {
                updateContrast(event.target.value as (typeof CONTRAST_OPTIONS)[number]);
              }}
              value={settings.contrast}
            >
              {CONTRAST_OPTIONS.map((contrast) => (
                <option key={contrast} value={contrast}>
                  {CONTRAST_LABELS[contrast]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-card" htmlFor="pronoun-mode">
            <span className="field-label">Pronoun preference</span>
            <span className="field-help">Save a display preference for supported passages without changing the source text.</span>
            <select
              className="field-select"
              data-testid="pronoun-mode"
              id="pronoun-mode"
              onChange={(event) => {
                void updatePronounMode(event.target.value as (typeof PRONOUN_MODE_OPTIONS)[number]);
              }}
              value={pronounMode}
            >
              {PRONOUN_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {PRONOUN_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </label>
        </form>

        <div className="settings-actions">
          <button className="secondary-button" onClick={resetSettings} type="button">
            Reset reading defaults
          </button>
        </div>
      </PageSection>
    </PageLayout>
  );
}

export function FocusPracticeSettingsPage() {
  const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [clockOverride, setClockOverride] = useState<DailyPracticeClockOverride>(() => loadDailyPracticeClockOverride());
  const [middleSlotChoiceId, setMiddleSlotChoiceId] = useState(() => loadDailyQuickAccessMiddleSlotId());
  const [quickAccessChoices, setQuickAccessChoices] = useState<DailyQuickAccessChoice[]>([]);

  const updateClockOverride = (nextOverride: DailyPracticeClockOverride) => {
    setClockOverride(nextOverride);
    saveDailyPracticeClockOverride(nextOverride);
  };

  const updateMiddleSlotChoice = (choiceId: string) => {
    setMiddleSlotChoiceId(choiceId);
    saveDailyQuickAccessMiddleSlot(choiceId.length > 0 ? choiceId : null);
  };

  useEffect(() => {
    let isMounted = true;

    void ensureStorageReady(appDb)
      .then(async () => {
        const [documents, downloads] = await Promise.all([appDb.documents.toArray(), appDb.downloads.toArray()]);

        if (isMounted) {
          setQuickAccessChoices(createDailyQuickAccessChoices(documents, downloads));
        }
      })
      .catch(() => {
        if (isMounted) {
          setQuickAccessChoices([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const { showToast, trigger } = useSaveToast();

  return (
    <PageLayout
      description="Set the local clock Focus uses when this device clock is wrong."
      eyebrow="Settings"
      headerBadge={<SettingsBackLink />}
      title="Focus & Practice"
    >
      <SaveToast visible={showToast} />
      <PageSection description="Daily Focus remains a shared UTC focus; this setting corrects the app's understanding of now." title="Manual local time">
        <form className="settings-form" onChange={trigger}>
          <label className="field-card field-card--toggle" htmlFor="setting-daily-clock-override-toggle">
            <span className="field-label">Manual local time</span>
            <span className="field-help">Use this only when this device clock is wrong.</span>
            <span className="filter-toggle">
              <input
                checked={clockOverride.enabled}
                data-testid="setting-daily-clock-override-toggle"
                id="setting-daily-clock-override-toggle"
                onChange={(event) => {
                  updateClockOverride({
                    enabled: event.target.checked,
                    localDateTime:
                      event.target.checked && clockOverride.localDateTime.length === 0
                        ? formatDailyPracticeClockInputValue(new Date())
                        : clockOverride.localDateTime,
                    timeZone:
                      event.target.checked && clockOverride.timeZone.trim().length === 0
                        ? resolvedTimeZone
                        : clockOverride.timeZone,
                  });
                }}
                type="checkbox"
              />
              Use a manual clock for Focus
            </span>
          </label>

          <label className="field-card" htmlFor="setting-daily-clock-override-time-zone">
            <span className="field-label">Time zone</span>
            <span className="field-help">Set the time zone for the manual clock.</span>
            <input
              className="field-input"
              data-testid="setting-daily-clock-override-time-zone"
              disabled={!clockOverride.enabled}
              id="setting-daily-clock-override-time-zone"
              onChange={(event) => {
                updateClockOverride({
                  ...clockOverride,
                  timeZone: event.target.value,
                });
              }}
              placeholder="America/Chicago"
              type="text"
              value={clockOverride.timeZone}
            />
          </label>

          <label className="field-card" htmlFor="setting-daily-clock-override-input">
            <span className="field-label">Local time</span>
            <span className="field-help">Set the date and time Focus should follow.</span>
            <input
              className="field-input"
              data-testid="setting-daily-clock-override-input"
              disabled={!clockOverride.enabled}
              id="setting-daily-clock-override-input"
              onChange={(event) => {
                updateClockOverride({
                  ...clockOverride,
                  localDateTime: event.target.value,
                });
              }}
              type="datetime-local"
              value={clockOverride.localDateTime}
            />
          </label>
        </form>

        <div className="settings-actions">
          <button
            className="secondary-button"
            data-testid="setting-daily-clock-override-reset"
            disabled={!clockOverride.enabled && clockOverride.localDateTime.length === 0 && clockOverride.timeZone.length === 0}
            onClick={() => {
              updateClockOverride(DEFAULT_DAILY_PRACTICE_CLOCK_OVERRIDE);
            }}
            type="button"
          >
            Use device time
          </button>
        </div>
      </PageSection>

      <PageSection description="Choose the middle button on Daily Focus, or clear it back to the settings shortcut." title="Daily Focus quick access">
        <form className="settings-form" onChange={trigger}>
          <label className="field-card" htmlFor="setting-daily-quick-access-middle-slot">
            <span className="field-label">Middle slot</span>
            <span className="field-help">This changes only the center Quick access button on this device.</span>
            <select
              className="field-select"
              data-testid="setting-daily-quick-access-middle-slot"
              id="setting-daily-quick-access-middle-slot"
              onChange={(event) => {
                updateMiddleSlotChoice(event.target.value);
              }}
              value={middleSlotChoiceId}
            >
              <option value="">Default slot</option>
              {quickAccessChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.title}
                </option>
              ))}
            </select>
          </label>
        </form>

        <div className="settings-actions">
          <button
            className="secondary-button"
            data-testid="setting-daily-quick-access-clear"
            disabled={middleSlotChoiceId.length === 0}
            onClick={() => {
              updateMiddleSlotChoice('');
            }}
            type="button"
          >
            Clear middle slot
          </button>
        </div>
      </PageSection>
    </PageLayout>
  );
}

export function TimerDefaultsSettingsPage() {
  const [timerPreferences, setTimerPreferences] = useState<TimerPreferences>(() => loadTimerPreferences());
  const { showToast, trigger } = useSaveToast();

  const updateTimerPreferences = (updates: Partial<TimerPreferences>) => {
    const nextPreferences = {
      ...timerPreferences,
      ...updates,
    };

    setTimerPreferences(nextPreferences);
    saveTimerPreferences(nextPreferences);
  };

  return (
    <PageLayout
      description="Change the timer's default duration, bell mode, sound, and history settings here."
      eyebrow="Settings"
      headerBadge={<SettingsBackLink />}
      title="Timer Defaults"
    >
      <SaveToast visible={showToast} />
      <PageSection
        description="Every new timer opens with these defaults."
        title="Session defaults"
      >
        <form className="settings-form" onChange={trigger}>
          <label className="field-card" htmlFor="setting-timer-duration-seconds">
            <span className="field-label">Default duration</span>
            <span className="field-help">Set the length each new timer should open with on this device.</span>
            <input
              className="field-select"
              data-testid="setting-timer-duration-seconds"
              id="setting-timer-duration-seconds"
              inputMode="numeric"
              min={1}
              onChange={(event) => {
                updateTimerPreferences({
                  defaultDurationSeconds: clampTimerDurationPreference(event.target.value),
                });
              }}
              type="number"
              value={timerPreferences.defaultDurationSeconds}
            />
          </label>

          <label className="field-card" htmlFor="setting-timer-cue-mode">
            <span className="field-label">Default bell mode</span>
            <span className="field-help">Choose whether new timers ring at the beginning, the end, both, or on a custom spacing.</span>
            <select
              className="field-select"
              data-testid="setting-timer-cue-mode"
              id="setting-timer-cue-mode"
              onChange={(event) => {
                const nextCueMode = event.target.value as TimerCueMode;
                updateTimerPreferences({
                  defaultCueMode: nextCueMode,
                  defaultIntervalSeconds:
                    nextCueMode === 'custom' && timerPreferences.defaultIntervalSeconds === 0
                      ? 60
                      : nextCueMode === 'custom'
                        ? timerPreferences.defaultIntervalSeconds
                        : 0,
                });
              }}
              value={timerPreferences.defaultCueMode}
            >
              {TIMER_CUE_MODES.map((cueMode) => (
                <option key={cueMode} value={cueMode}>
                  {TIMER_CUE_MODE_LABELS[cueMode]}
                </option>
              ))}
            </select>
          </label>

          {timerPreferences.defaultCueMode === 'custom' ? (
            <label className="field-card" htmlFor="setting-timer-interval-seconds">
              <span className="field-label">Ring every</span>
              <span className="field-help">Set how many seconds apart the bowl rings while a custom timer is running.</span>
              <input
                className="field-select"
                data-testid="setting-timer-interval-seconds"
                id="setting-timer-interval-seconds"
                inputMode="numeric"
                min={1}
                onChange={(event) => {
                  updateTimerPreferences({
                    defaultIntervalSeconds: clampTimerIntervalPreference(event.target.value),
                  });
                }}
                type="number"
                value={timerPreferences.defaultIntervalSeconds}
              />
            </label>
          ) : null}

          <label className="field-card" htmlFor="setting-timer-sound-profile">
            <span className="field-label">Default bell sound</span>
            <span className="field-help">Pick the sound each new timer session should use for opening, reminder, and closing bells.</span>
            <select
              className="field-select"
              data-testid="setting-timer-sound-profile"
              id="setting-timer-sound-profile"
              onChange={(event) => {
                updateTimerPreferences({
                  defaultSoundProfileId: event.target.value as TimerPreferences['defaultSoundProfileId'],
                });
              }}
              value={timerPreferences.defaultSoundProfileId}
            >
              {SOUND_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-card field-card--toggle" htmlFor="setting-timer-record-history">
            <span className="field-label">Record practice history by default</span>
            <span className="field-help">Save finished sessions on this device unless you turn it off for a new session.</span>
            <span className="filter-toggle">
              <input
                checked={timerPreferences.recordPracticeHistory}
                data-testid="setting-timer-record-history"
                id="setting-timer-record-history"
                onChange={(event) => {
                  updateTimerPreferences({
                    recordPracticeHistory: event.target.checked,
                  });
                }}
                type="checkbox"
              />
              Save completed meditation sessions on this device
            </span>
          </label>
        </form>

        <div className="settings-actions">
          <button
            className="secondary-button"
            onClick={() => {
              clearTimerPreferencesStorage();
              setTimerPreferences(DEFAULT_TIMER_PREFERENCES);
              saveTimerPreferences(DEFAULT_TIMER_PREFERENCES);
            }}
            type="button"
          >
            Reset timer defaults
          </button>
        </div>
      </PageSection>
    </PageLayout>
  );
}

export function AboutLegalSettingsPage() {
  const bundledAudioRightsAssets = getBundledAudioRightsAssets();
  const [isRepairing, setIsRepairing] = useState(false);

  const handleRepairOfflineCache = async () => {
    if (isRepairing) {
      return;
    }

    setIsRepairing(true);

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(registrations.map(async (registration) => {
        await registration.unregister();
      }));

      const cacheKeys = await caches.keys();
      const workboxCaches = cacheKeys.filter((key) => key.startsWith('workbox-'));

      await Promise.all(workboxCaches.map(async (key) => {
        await caches.delete(key);
      }));

      window.location.href = import.meta.env.BASE_URL || '/';
    } catch {
      setIsRepairing(false);
    }
  };

    return (
      <PageLayout
      description="Read local-only privacy notes, sound rights, and legal terms."
      eyebrow="Settings"
      headerBadge={<SettingsBackLink />}
      title="About & Legal"
    >
      <PageSection
        description="The app shell shows install and offline status."
        title="App access"
      >
        <div className="detail-grid">
          <div className="detail-card">
            <h3>Private local-only release</h3>
            <p>This shipped interface stores personal notes, bookmarks, practice history, reading settings, and saved-sermon markers in this browser on this device.</p>
          </div>
          <div className="detail-card">
            <h3>Install on this device</h3>
            <p>The install action stays in the shell header whenever your browser makes it available.</p>
          </div>
          <div className="detail-card">
            <h3>Refresh installed app</h3>
            <p>If the app behaves unexpectedly — such as repeated errors after an update — this clears the cached offline layer and reloads with a fresh copy.</p>
            <button
              className="secondary-button"
              data-testid="repair-offline-cache"
              disabled={isRepairing}
              onClick={() => {
                void handleRepairOfflineCache();
              }}
              type="button"
            >
              {isRepairing ? 'Refreshing…' : 'Repair offline cache'}
            </button>
          </div>
          <div className="detail-card">
            <h3>Creator and support links</h3>
            <p>The app header links to <a href="https://odinhalvorson.com" rel="noreferrer" target="_blank">odinhalvorson.com</a> and a Ko-fi support page at <a href="https://ko-fi.com/indubitablyodin" rel="noreferrer" target="_blank">ko-fi.com/indubitablyodin</a>.</p>
          </div>
          <div className="detail-card">
            <h3>Offline reading</h3>
            <p>The offline banner appears above page content so saved reading and settings are still visible when the device goes offline.</p>
          </div>
        </div>
      </PageSection>

      <PageSection
        description="Cue sounds stay listed here with their license, source, and attribution details."
        title="Audio & rights"
      >
        <div className="detail-grid">
          {bundledAudioRightsAssets.map((asset) => (
            <article className="detail-card" data-testid={`audio-rights-${asset.id}`} key={asset.id}>
              <p className="detail-card__eyebrow">{asset.title}</p>
              <h3>{asset.license}</h3>
              <p>{asset.provenance}</p>
              <dl>
                <dt>Review status</dt>
                <dd>{toSentenceCase(asset.approvalStatus)}</dd>
                <dt>Source check</dt>
                <dd>{toSentenceCase(asset.provenanceStatus)}</dd>
                <dt>Attribution</dt>
                <dd>{asset.attribution}</dd>
              </dl>
              {asset.licenseUrl ? (
                <p>
                  <a href={asset.licenseUrl}>License details</a>
                </p>
              ) : null}
              <div>
                <p className="field-label">Bundled files</p>
                <ul className="source-list">
                  {asset.files.map((file) => (
                    <li key={file.path}>
                      {toSentenceCase(file.cue)} cue · <a href={getAppAssetPath(file.path)}>{file.path}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="field-label">Source links</p>
                {renderAudioRightsSources(asset)}
              </div>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection
        description="Read what this local-only release stores and how to contact the operator."
        title="Privacy & terms"
      >
        <div className="detail-grid">
          <div className="detail-card">
            <h3>Operator contact</h3>
            <p>For privacy, data-rights, and legal questions, email <a href="mailto:totjo@odinhalvorson.com">totjo@odinhalvorson.com</a>.</p>
          </div>
          <div className="detail-card">
            <h3>Local-only personal data</h3>
            <p>Your notes, bookmarks, practice history, reading preferences, and saved-sermon markers stay in browser storage on this device. The app operator does not receive that personal reading state through this app.</p>
          </div>
          <div className="detail-card">
            <h3>No cloud profile in this release</h3>
            <p>This interface does not offer app login, cloud profiles, or cross-device transfer. Clearing browser data or uninstalling the app may remove personal state kept on this device.</p>
          </div>
          <div className="detail-card">
            <h3>Bundled and public material</h3>
            <p>Bundled doctrine, supplemental reading, and public sermon listings are app content. Saving a sermon only marks it for offline reading on this device.</p>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <h3>Legal basis and purpose</h3>
            <p>The app stores local personal state so you can continue reading, keep notes and bookmarks, remember timer defaults, and record practice history on this device.</p>
          </div>
          <div className="detail-card">
            <h3>Retention and deletion</h3>
            <p>Local personal state remains in this browser until you clear it through app controls where available, clear browser storage, or uninstall the app.</p>
          </div>
          <div className="detail-card">
            <h3>Your rights</h3>
            <p>Because personal reading state is kept locally in this release, access and deletion are primarily controlled from this browser. You may still email <a href="mailto:totjo@odinhalvorson.com">totjo@odinhalvorson.com</a> with privacy or legal questions.</p>
          </div>
          <div className="detail-card">
            <h3>Terms of use</h3>
            <p>This app is provided for reading, reflection, and personal study. You are responsible for the notes you write and the material you keep on your device. To the fullest extent permitted by law, the app is provided on an “as is” and “as available” basis.</p>
          </div>
        </div>
      </PageSection>
    </PageLayout>
  );
}
