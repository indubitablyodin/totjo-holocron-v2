import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  loadPronounMode,
  PERSONALIZATION_RULES_EVENT,
  savePronounMode,
  type PronounMode,
} from '@/features/personalization/personalizationRules';

type PersonalizationContextValue = {
  pronounMode: PronounMode;
  updatePronounMode: (pronounMode: PronounMode) => Promise<void>;
};

const PersonalizationContext = createContext<PersonalizationContextValue | null>(null);

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const [pronounMode, setPronounMode] = useState<PronounMode>('they');

  useEffect(() => {
    let isMounted = true;

    const syncFromStorage = async () => {
      const nextPronounMode = await loadPronounMode();

      if (!isMounted) {
        return;
      }

      setPronounMode((currentPronounMode) => (currentPronounMode === nextPronounMode ? currentPronounMode : nextPronounMode));
    };

    void syncFromStorage();
    window.addEventListener(PERSONALIZATION_RULES_EVENT, syncFromStorage);

    return () => {
      isMounted = false;
      window.removeEventListener(PERSONALIZATION_RULES_EVENT, syncFromStorage);
    };
  }, []);

  const value = useMemo<PersonalizationContextValue>(
    () => ({
      pronounMode,
      updatePronounMode: async (nextPronounMode) => {
        setPronounMode(nextPronounMode);
        await savePronounMode(nextPronounMode);
      },
    }),
    [pronounMode],
  );

  return <PersonalizationContext.Provider value={value}>{children}</PersonalizationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePersonalization() {
  const context = useContext(PersonalizationContext);

  if (!context) {
    throw new Error('usePersonalization must be used within PersonalizationProvider');
  }

  return context;
}
