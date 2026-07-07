/**
 * Shared time-window helpers for the chat toolsets. Every data tool (parent or
 * teacher) accepts the same window params — a named `period`, a specific
 * `month` (YYYY-MM), or explicit `from`/`to` — so the AI can answer "this
 * month / this year / so far" questions without asking the user to pick a date.
 */

export type Period = "day" | "week" | "month" | "year" | "all";

export type DateRange = { from: string; to: string };

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysFromTodayIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function normalizePeriod(value: unknown): Period {
  return value === "day" ||
    value === "month" ||
    value === "year" ||
    value === "all"
    ? value
    : "week";
}

/** Trim a list to a sensible count for the period to bound token cost. */
export function limit<T>(items: T[], period: Period): T[] {
  const max =
    period === "day"
      ? 1
      : period === "week"
        ? 7
        : period === "month"
          ? 31
          : 90;
  return items.slice(0, max);
}

/** True when the model asked for any explicit time window (vs. a bare call). */
export function hasRangeArgs(args: Record<string, unknown>): boolean {
  return (
    typeof args.period === "string" ||
    typeof args.month === "string" ||
    typeof args.from === "string" ||
    typeof args.to === "string"
  );
}

/**
 * Resolve a {from,to} window from model args: explicit from/to, a specific
 * month (YYYY-MM), or a named period. Falls back to the current month.
 */
export function resolveRange(args: Record<string, unknown>): DateRange {
  const from = typeof args.from === "string" ? args.from : undefined;
  const to = typeof args.to === "string" ? args.to : undefined;
  if (from || to) {
    return { from: from ?? "2000-01-01", to: to ?? todayIso() };
  }
  const month = typeof args.month === "string" ? args.month : undefined;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { from: `${month}-01`, to: isoDate(new Date(Date.UTC(y, m, 0))) };
  }
  return rangeForPeriod(normalizePeriod(args.period ?? "month"));
}

/** A calendar-aligned {from,to} for a named period, relative to today. */
export function rangeForPeriod(period: Period): DateRange {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const today = isoDate(now);
  switch (period) {
    case "day":
      return { from: today, to: today };
    case "week": {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 6);
      return { from: isoDate(start), to: today };
    }
    case "month":
      return {
        from: isoDate(new Date(Date.UTC(y, m, 1))),
        to: isoDate(new Date(Date.UTC(y, m + 1, 0))),
      };
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "all":
      return {
        from: "2000-01-01",
        to: isoDate(new Date(Date.UTC(y + 1, m, 1))),
      };
  }
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Keep list items whose date field (YYYY-MM-DD or ISO datetime) is in range. */
export function filterByDate<T>(
  items: T[],
  field: keyof T & string,
  range: DateRange,
): T[] {
  return items.filter((item) => {
    const value = (item as Record<string, unknown>)[field];
    if (typeof value !== "string") return false;
    const day = value.slice(0, 10);
    return day >= range.from && day <= range.to;
  });
}

/** Whole years between a date-of-birth ISO string and today. */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}
