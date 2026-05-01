import { appDb, ensureStorageReady, type HolocronDatabase } from '@/lib/db';

export const PERSONALIZATION_RULES_EVENT = 'totjo-holocron:personalization-rules-updated';
export const PRONOUN_MODE_OPTIONS = ['he', 'she', 'they'] as const;
export const PRONOUN_MODE_RULE_ID = 'global:pronoun-mode';

export type PronounMode = (typeof PRONOUN_MODE_OPTIONS)[number];

function isPronounMode(value: string | null | undefined): value is PronounMode {
  return value === 'he' || value === 'she' || value === 'they';
}

export function dispatchPersonalizationRulesUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new window.Event(PERSONALIZATION_RULES_EVENT));
}

export async function loadPronounMode(database: HolocronDatabase = appDb): Promise<PronounMode> {
  await ensureStorageReady(database);

  const rule = await database.personalizationRules.get(PRONOUN_MODE_RULE_ID);

  if (!rule || !isPronounMode(rule.replacement)) {
    return 'they';
  }

  return rule.enabled ? rule.replacement : 'they';
}

export async function savePronounMode(mode: PronounMode, database: HolocronDatabase = appDb): Promise<void> {
  await ensureStorageReady(database);

  await database.personalizationRules.put({
    id: PRONOUN_MODE_RULE_ID,
    scope: 'global',
    documentId: null,
    token: 'pronoun-mode',
    replacement: mode,
    enabled: true,
    updatedAt: new Date().toISOString(),
  });

  dispatchPersonalizationRulesUpdated();
}

export async function resetPersonalizationRules(database: HolocronDatabase = appDb): Promise<void> {
  await ensureStorageReady(database);
  await database.personalizationRules.clear();
  dispatchPersonalizationRulesUpdated();
}
