/**
 * Calendar-month bounds in Asia/Tashkent time, expressed as UTC date-only
 * values (the convention for `@db.Date` columns). Used by the director tuition
 * console and monthly invoice generation so both agree on what "this month" is.
 */
export type TashkentMonth = {
  periodStartDate: Date;
  nextPeriodStartDate: Date;
  periodEndDate: Date;
  /** e.g. "2026-07" */
  label: string;
};

export function currentTashkentMonth(): TashkentMonth {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const periodStartDate = new Date(Date.UTC(year, month - 1, 1));
  const nextPeriodStartDate = new Date(Date.UTC(year, month, 1));
  const periodEndDate = new Date(nextPeriodStartDate);
  periodEndDate.setUTCDate(periodEndDate.getUTCDate() - 1);

  return {
    periodStartDate,
    nextPeriodStartDate,
    periodEndDate,
    label: `${year}-${String(month).padStart(2, "0")}`,
  };
}

export function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
