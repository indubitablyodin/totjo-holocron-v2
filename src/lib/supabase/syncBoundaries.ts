export const SUPABASE_SYNC_TABLES = [
  'user_progress',
  'user_settings',
  'user_bookmarks',
  'user_notes',
  'user_practice_history',
  'user_downloads',
  'user_personalization_rules',
] as const;

export const USER_SYNC_BOUNDARY_LABELS = [
  'Reading progress',
  'Reading and timer settings',
  'Bookmarks',
  'Notes',
  'Practice history',
  'Saved sermon downloads',
  'Pronoun preference',
] as const;

export const LOCAL_ONLY_BOUNDARY_LABELS = [
  'Bundled reading text',
  'Sermon text you have not saved',
  'Reading and timer use without an account',
] as const;
