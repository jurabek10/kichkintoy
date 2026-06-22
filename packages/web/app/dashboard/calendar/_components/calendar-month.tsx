"use client";

import type { CalendarEventSummary } from "@kichkintoy/shared";
import { Card } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";

const weekdays = [
  "weekdays.sun",
  "weekdays.mon",
  "weekdays.tue",
  "weekdays.wed",
  "weekdays.thu",
  "weekdays.fri",
  "weekdays.sat",
] as const;

export function CalendarMonth({
  month,
  events,
  selectedDate,
  onSelectDate,
}: {
  month: string;
  events: CalendarEventSummary[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const { t } = useLayoutTranslation("calendar");
  const days = monthDays(month);
  const today = toIsoDate(new Date());
  const eventCounts = new Map<string, number>();
  for (const event of events) {
    const key = event.startsAt.slice(0, 10);
    eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {weekdays.map((day) => (
          <div key={day} className="px-2 py-2.5">
            {t(day)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="h-20 border-b border-r bg-muted/20 last:border-r-0 sm:h-24"
              />
            );
          }
          const count = eventCounts.get(day) ?? 0;
          const isSelected = selectedDate === day;
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-pressed={isSelected}
              className={cn(
                "group flex h-20 flex-col items-stretch gap-1 border-b border-r p-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:h-24 sm:p-2",
                "[&:nth-child(7n)]:border-r-0",
                isSelected ? "bg-primary/10" : "hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-sm font-bold tabular-nums",
                  isToday && !isSelected && "bg-primary text-primary-foreground",
                  isSelected && "text-primary",
                  !isToday && !isSelected && "text-foreground",
                )}
              >
                {Number(day.slice(8, 10))}
              </span>
              {count > 0 ? (
                <span className="mt-auto flex items-center gap-1 px-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  ))}
                  {count > 3 ? (
                    <span className="text-[10px] font-bold text-primary">
                      +{count - 3}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function monthDays(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const first = new Date(year, monthIndex - 1, 1);
  const last = new Date(year, monthIndex, 0);
  const days: Array<string | null> = Array.from(
    { length: first.getDay() },
    () => null,
  );
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(toIsoDate(new Date(year, monthIndex - 1, day)));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function toIsoDate(value: Date) {
  // Local date — NOT toISOString(), which shifts to UTC and rolls the day back
  // a calendar day in positive-offset zones (e.g. Uzbekistan, UTC+5).
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
