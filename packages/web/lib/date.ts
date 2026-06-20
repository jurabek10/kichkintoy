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

const UZ_OFFSET_MIN = 5 * 60;
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: string | Date): Date {
  if (typeof value !== "string") return value;
  if (ISO_DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year!, month! - 1, day!);
  }
  return new Date(value);
}

/**
 * Uzbekistan is fixed UTC+5. Convert an instant into a Date whose local fields
 * match Tashkent wall-clock time, so formatting is stable on Korea/US devices.
 */
export function toUzbekistanDate(value: string | Date): Date {
  if (typeof value === "string" && ISO_DATE_ONLY.test(value)) return toDate(value);
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return date;
  const uz = new Date(date.getTime() + UZ_OFFSET_MIN * 60_000);
  return new Date(
    uz.getUTCFullYear(),
    uz.getUTCMonth(),
    uz.getUTCDate(),
    uz.getUTCHours(),
    uz.getUTCMinutes(),
    uz.getUTCSeconds(),
    uz.getUTCMilliseconds(),
  );
}

/** "Dushanba, 15-iyun" — weekday + day + month. */
export function formatWeekdayLong(value: string | Date, language: string): string {
  return format(toUzbekistanDate(value), "EEEE, d MMMM", { locale: dateLocale(language) });
}

/** "15-iyun" — day + month, no weekday. */
export function formatDayMonth(value: string | Date, language: string): string {
  return format(toUzbekistanDate(value), "d MMMM", { locale: dateLocale(language) });
}

/** "15-iyun, 16:30" — day, month, 24h time. */
export function formatDayMonthTime(value: string | Date, language: string): string {
  return format(toUzbekistanDate(value), "d MMMM, HH:mm", { locale: dateLocale(language) });
}

/** "16:30" — 24-hour time. */
export function formatTime(value: string | Date): string {
  return format(toUzbekistanDate(value), "HH:mm");
}

/** "2 soat oldin" — short relative time in the active language. */
export function formatRelative(value: string | Date, language: string): string {
  return formatDistanceToNowStrict(toDate(value), {
    locale: dateLocale(language),
    addSuffix: true,
  });
}
