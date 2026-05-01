import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  DEFAULT_READING_SETTINGS,
  applyReadingSettings,
  loadReadingSettings,
  saveReadingSettings,
  type ContrastMode,
  type FontScale,
  type ReadingSettings,
  type ThemeMode,
} from '@/features/settings/readingSettings';
import { USER_SETTINGS_SYNC_EVENT } from '@/lib/sync/settingsMeta';

function areReadingSettingsEqual(left: ReadingSettings, right: ReadingSettings) {
  return left.fontScale === right.fontScale && left.theme === right.theme && left.contrast === right.contrast;
}

type ReadingSettingsContextValue = {
  settings: ReadingSettings;
  updateFontScale: (fontScale: FontScale) => void;
  updateTheme: (theme: ThemeMode) => void;
  updateContrast: (contrast: ContrastMode) => void;
  resetSettings: () => void;
};

const ReadingSettingsContext = createContext<ReadingSettingsContextValue | null>(null);

export function ReadingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReadingSettings>(() => loadReadingSettings());
  const hasMountedRef = useRef(false);

  useEffect(() => {
    applyReadingSettings(settings, document);

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    saveReadingSettings(settings);
  }, [settings]);

  useEffect(() => {
    const syncFromStorage = () => {
      const nextSettings = loadReadingSettings();

      setSettings((currentSettings) =>
        areReadingSettingsEqual(currentSettings, nextSettings) ? currentSettings : nextSettings,
      );
    };

    window.addEventListener(USER_SETTINGS_SYNC_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener(USER_SETTINGS_SYNC_EVENT, syncFromStorage);
    };
  }, []);

  const value = useMemo<ReadingSettingsContextValue>(
    () => ({
      settings,
      updateFontScale: (fontScale) => {
        setSettings((currentSettings) => ({ ...currentSettings, fontScale }));
      },
      updateTheme: (theme) => {
        setSettings((currentSettings) => ({ ...currentSettings, theme }));
      },
      updateContrast: (contrast) => {
        setSettings((currentSettings) => ({ ...currentSettings, contrast }));
      },
      resetSettings: () => {
        setSettings(DEFAULT_READING_SETTINGS);
      },
    }),
    [settings],
  );

  return <ReadingSettingsContext.Provider value={value}>{children}</ReadingSettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReadingSettings() {
  const context = useContext(ReadingSettingsContext);

  if (!context) {
    throw new Error('useReadingSettings must be used within ReadingSettingsProvider');
  }

  return context;
}
