import type { Language } from '@kichkintoy/translations/settings';

/**
 * Tiny locale-aware date formatting for uz/ru/en. We hand-roll the names
 * instead of relying on `Intl`, which is only partially implemented in Hermes.
 */
const WEEKDAYS_SHORT: Record<Language, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  uz: ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'],
};

const WEEKDAYS_LONG: Record<Language, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  uz: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
};

const MONTHS: Record<Language, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
};

function lang(code: string): Language {
  return code in WEEKDAYS_SHORT ? (code as Language) : 'en';
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Uzbekistan runs on a fixed UTC+5 (no DST). The kindergarten is in Uzbekistan,
 * so every timestamp is shown in Tashkent wall-clock time regardless of the
 * device timezone — otherwise an instant renders in whatever zone the phone or
 * emulator happens to be set to (e.g. Korea, UTC+9).
 */
const UZ_OFFSET_MIN = 5 * 60;

/**
 * Wall-clock parts of an instant in Uzbekistan time. We shift the epoch by the
 * fixed offset and read the UTC fields, which is device-timezone independent.
 * A date-only string ("2026-06-12") is UTC midnight, so +5h keeps the same
 * calendar day — pure dates are never shifted.
 */
function uzParts(value: string) {
  const uz = new Date(new Date(value).getTime() + UZ_OFFSET_MIN * 60_000);
  return {
    year: uz.getUTCFullYear(),
    monthIndex: uz.getUTCMonth(),
    day: uz.getUTCDate(),
    hours: uz.getUTCHours(),
    minutes: uz.getUTCMinutes(),
    weekday: uz.getUTCDay(),
  };
}

/** Today's date in Uzbekistan as "YYYY-MM-DD". */
export function todayIsoDate(): string {
  const { year, monthIndex, day } = uzParts(new Date().toISOString());
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

/** The Uzbekistan calendar date ("YYYY-MM-DD") of an ISO date or datetime. */
export function localIsoDate(iso: string): string {
  if (Number.isNaN(new Date(iso).getTime())) return iso.slice(0, 10);
  const { year, monthIndex, day } = uzParts(iso);
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

/** Parse an ISO date ("2026-06-12") in local time (no UTC shift). */
export function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  return { year: year!, monthIndex: month! - 1, day: day!, weekday: date.getDay() };
}

export function weekdayShort(iso: string, code: string) {
  return WEEKDAYS_SHORT[lang(code)][parseIsoDate(iso).weekday];
}

export function weekdayLong(iso: string, code: string) {
  return WEEKDAYS_LONG[lang(code)][parseIsoDate(iso).weekday];
}

export function monthName(monthIndex: number, code: string) {
  return MONTHS[lang(code)][monthIndex];
}

/** "June 2026" (English) / "Iyun 2026" / "Июнь 2026". */
export function formatMonthYear(year: number, monthIndex: number, code: string) {
  return `${monthName(monthIndex, code)} ${year}`;
}

/** "12 June 2026" — long-ish date for the report detail header. */
export function formatLongDate(iso: string, code: string) {
  const { day, monthIndex, year } = parseIsoDate(iso);
  return `${day} ${monthName(monthIndex, code)} ${year}`;
}

/** "12 Jun" — compact date for feed timestamps (ISO date or datetime), in UZ time. */
export function formatDayMonth(iso: string, code: string) {
  const { day, monthIndex } = uzParts(iso);
  const name = monthName(monthIndex, code);
  return `${day} ${lang(code) === 'uz' ? name : name.slice(0, 3)}`;
}

/** "14:05" — 24-hour time of an instant in Uzbekistan time. */
export function formatTime(iso: string) {
  if (Number.isNaN(new Date(iso).getTime())) return '';
  const { hours, minutes } = uzParts(iso);
  return `${pad(hours)}:${pad(minutes)}`;
}

/** "12 Jun · 14:05" — compact timestamp for comments and activity rows, in UZ time. */
export function formatDayMonthTime(iso: string, code: string) {
  if (Number.isNaN(new Date(iso).getTime())) return formatDayMonth(iso, code);
  return `${formatDayMonth(iso, code)} · ${formatTime(iso)}`;
}

/** Compact age from a date of birth, e.g. "2y 6m". */
export function ageLabel(iso: string): string {
  const { year, monthIndex, day } = parseIsoDate(iso);
  const now = new Date();
  let months = (now.getFullYear() - year) * 12 + (now.getMonth() - monthIndex);
  if (now.getDate() < day) months -= 1;
  if (months < 0) months = 0;
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}
