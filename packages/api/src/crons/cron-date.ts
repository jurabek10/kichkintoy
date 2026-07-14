export const TASHKENT_TIME_ZONE = "Asia/Tashkent";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function tashkentDate(value = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TASHKENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function parseDateOnly(value: string): Date {
  if (!ISO_DATE.test(value)) throw new Error("Date must use YYYY-MM-DD.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Invalid calendar date.");
  }
  return date;
}

export function addDateDays(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** UTC instants bounding a calendar day in fixed-offset Asia/Tashkent (UTC+5). */
export function tashkentDayBounds(value: string): { start: Date; end: Date } {
  const day = parseDateOnly(value);
  const start = new Date(day.getTime() - 5 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function tashkentInstant(value: string, hour: number, minute = 0): Date {
  const { start } = tashkentDayBounds(value);
  return new Date(start.getTime() + (hour * 60 + minute) * 60 * 1000);
}

export function dateOnlyRange(start: string, endExclusive: string) {
  return { gte: parseDateOnly(start), lt: parseDateOnly(endExclusive) };
}

export function daysBetween(left: string, right: string): number {
  return Math.round(
    (parseDateOnly(right).getTime() - parseDateOnly(left).getTime()) /
      86_400_000,
  );
}

export function formatFallbackDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
