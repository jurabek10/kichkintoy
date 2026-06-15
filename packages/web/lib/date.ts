import { format, formatDistanceToNowStrict, type Locale } from "date-fns";
import { enUS, ru, uz } from "date-fns/locale";

/**
 * Locale-aware date formatting. Native `toLocaleDateString(undefined, …)` uses
 * the *runtime's* default locale, not the language the user picked — so dates
 * render in English even under Uzbek/Russian. These helpers map the active
 * i18n language to a date-fns locale (Uzbek included) so month and weekday
 * names follow the chosen language. Times use a 24-hour clock, the norm in UZ.
 */
const LOCALES: Record<string, Locale> = { en: enUS, ru, uz };

export function dateLocale(language: string | undefined): Locale {
  return LOCALES[(language ?? "en").slice(0, 2)] ?? enUS;
}

/**
 * The active date-fns locale, read from `<html lang>` (kept in sync by the
 * language switcher's reload). For client components without i18n context,
 * e.g. the generic date picker.
 */
export function currentDateLocale(): Locale {
  const lang =
    typeof document !== "undefined" ? document.documentElement.lang : "en";
  return dateLocale(lang);
}

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** "Dushanba, 15-iyun" — weekday + day + month. */
export function formatWeekdayLong(value: string | Date, language: string): string {
  return format(toDate(value), "EEEE, d MMMM", { locale: dateLocale(language) });
}

/** "15-iyun" — day + month, no weekday. */
export function formatDayMonth(value: string | Date, language: string): string {
  return format(toDate(value), "d MMMM", { locale: dateLocale(language) });
}

/** "15-iyun, 16:30" — day, month, 24h time. */
export function formatDayMonthTime(value: string | Date, language: string): string {
  return format(toDate(value), "d MMMM, HH:mm", { locale: dateLocale(language) });
}

/** "16:30" — 24-hour time. */
export function formatTime(value: string | Date): string {
  return format(toDate(value), "HH:mm");
}

/** "2 soat oldin" — short relative time in the active language. */
export function formatRelative(value: string | Date, language: string): string {
  return formatDistanceToNowStrict(toDate(value), {
    locale: dateLocale(language),
    addSuffix: true,
  });
}
