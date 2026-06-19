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

/** Today's date as a local "YYYY-MM-DD". */
export function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The local calendar date ("YYYY-MM-DD") of an ISO date or datetime. */
export function localIsoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

/** "12 Jun" — compact date for feed timestamps (ISO date or datetime). */
export function formatDayMonth(iso: string, code: string) {
  const dateOnly = iso.slice(0, 10);
  const { day, monthIndex } = parseIsoDate(dateOnly);
  return `${day} ${monthName(monthIndex, code).slice(0, 3)}`;
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
