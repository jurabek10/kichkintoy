/**
 * Daily-report items are stored as language-neutral tokens (itemType "meal",
 * title "breakfast", value "half") by the teacher's web composer, then
 * translated to the parent's language here at read time. Older reports were
 * saved with English display text, so each lookup also maps the legacy label
 * back to its token — existing data reads correctly without a migration.
 *
 * This mirrors packages/web/.../report-item-i18n.ts; keep the two in sync.
 */

type T = (key: string, options?: { defaultValue?: string }) => string;

const TITLE_KEYS: Record<string, string> = {
  breakfast: 'composer.breakfast',
  lunch: 'composer.lunch',
  snack: 'composer.snack',
  nap: 'composer.nap',
  mainActivity: 'composer.mainActivity',
};

const VALUE_NS: Record<string, string> = {
  meal: 'composer.mealOptions',
  sleep: 'composer.sleepOptions',
  activity: 'composer.activityOptions',
  health: 'composer.healthOptions',
};

const VALUE_TOKENS: Record<string, readonly string[]> = {
  meal: ['all', 'most', 'half', 'little', 'none'],
  sleep: ['well_2h', 'well_1h30', 'well_1h', 'briefly', 'no_sleep', 'restless'],
  activity: ['very_active', 'active', 'moderate', 'passive', 'solo'],
  health: ['healthy', 'slight_fever', 'cough', 'stomach', 'unwell'],
};

const LEGACY_TITLE: Record<string, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  'afternoon snack': 'snack',
  nap: 'nap',
  'main activity': 'mainActivity',
};

const LEGACY_VALUE: Record<string, Record<string, string>> = {
  meal: {
    'ate everything': 'all',
    'ate most of it': 'most',
    'ate about half': 'half',
    'ate a little': 'little',
    "didn't eat": 'none',
  },
  sleep: {
    'slept well (2 hours)': 'well_2h',
    'slept well (1.5 hours)': 'well_1h30',
    'slept well (1 hour)': 'well_1h',
    'slept briefly (30 min)': 'briefly',
    "didn't sleep": 'no_sleep',
    'restless sleep': 'restless',
  },
  activity: {
    'very active and enthusiastic': 'very_active',
    active: 'active',
    'moderate participation': 'moderate',
    'watched from sidelines': 'passive',
    'preferred solo play': 'solo',
  },
  health: {
    'no health concerns': 'healthy',
    'slight fever': 'slight_fever',
    'cough / runny nose': 'cough',
    'stomach ache': 'stomach',
    'generally unwell': 'unwell',
  },
};

/** The item's slot name ("Breakfast", "Nap"…) in the viewer's language. */
export function translateItemTitle(title: string | null, t: T): string {
  if (!title) return '';
  if (TITLE_KEYS[title]) return t(TITLE_KEYS[title]);
  const legacy = LEGACY_TITLE[title.trim().toLowerCase()];
  if (legacy) return t(TITLE_KEYS[legacy]);
  return title;
}

/** The item's recorded value ("Ate about half"…) in the viewer's language. */
export function translateItemValue(itemType: string, value: string | null, t: T): string {
  if (!value) return '';
  const ns = VALUE_NS[itemType];
  if (ns) {
    if ((VALUE_TOKENS[itemType] ?? []).includes(value)) {
      return t(`${ns}.${value}`);
    }
    const legacy = LEGACY_VALUE[itemType]?.[value.trim().toLowerCase()];
    if (legacy) return t(`${ns}.${legacy}`);
  }
  return value;
}
