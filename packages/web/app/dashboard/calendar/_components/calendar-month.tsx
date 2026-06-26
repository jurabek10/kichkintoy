"use client";

import { Building2, Smile, Users } from "lucide-react";
import type { CalendarEventSummary } from "@kichkintoy/shared";
import { Card } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";

const EMPTY_DATES: Set<string> = new Set();

/** Audience → leading glyph + pastel tint, matching the event table. The icon
 *  names who each event is for, so a day's marks say more than a row of dots. */
const AUDIENCE: Record<
  CalendarEventSummary["audienceType"],
  { Icon: typeof Building2; chip: string }
> = {
  center: { Icon: Building2, chip: "bg-sky/25 text-sky-ink" },
  class: { Icon: Users, chip: "bg-grape/25 text-grape-ink" },
  child: { Icon: Smile, chip: "bg-mint/25 text-mint-ink" },
};

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
  birthdayDates,
  selectedDate,
  onSelectDate,
}: {
  month: string;
  events: CalendarEventSummary[];
  /** Days (ISO "YYYY-MM-DD") that have a classmate birthday. */
  birthdayDates?: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const { t } = useLayoutTranslation("calendar");
  const days = monthDays(month);
  const today = toIsoDate(new Date());
  const birthdays = birthdayDates ?? EMPTY_DATES;
  const eventsByDay = new Map<string, CalendarEventSummary[]>();
  for (const event of events) {
    const key = event.startsAt.slice(0, 10);
    const list = eventsByDay.get(key);
    if (list) list.push(event);
    else eventsByDay.set(key, [event]);
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
          const dayEvents = eventsByDay.get(day) ?? [];
          const hasBirthday = birthdays.has(day);
          const isSelected = selectedDate === day;
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex h-20 flex-col items-stretch gap-1 border-b border-r p-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:h-24 sm:p-2",
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
              {hasBirthday ? (
                <span
                  className="absolute right-1 top-1 text-xs leading-none sm:text-sm"
                  aria-hidden
                >
                  🎂
                </span>
              ) : null}
              {dayEvents.length > 0 ? (
                <span className="mt-auto flex items-center gap-0.5">
                  {dayEvents.slice(0, 3).map((event, index) => {
                    const { Icon, chip } = AUDIENCE[event.audienceType];
                    return (
                      <span
                        key={index}
                        className={cn(
                          "grid h-[18px] w-[18px] place-items-center rounded-full",
                          chip,
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" />
                      </span>
                    );
                  })}
                  {dayEvents.length > 3 ? (
                    <span className="text-[10px] font-bold text-muted-foreground">
                      +{dayEvents.length - 3}
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

/** The grid's key: what each audience glyph and the cake mean. */
export function CalendarLegend() {
  const { t } = useLayoutTranslation("calendar");
  const items = [
    ["center", "audience.wholeCenter"],
    ["class", "audience.class"],
    ["child", "audience.child"],
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 px-1 text-xs text-muted-foreground">
      {items.map(([audience, labelKey]) => {
        const { Icon, chip } = AUDIENCE[audience];
        return (
          <span key={audience} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "grid h-[18px] w-[18px] place-items-center rounded-full",
                chip,
              )}
            >
              <Icon className="h-2.5 w-2.5" />
            </span>
            {t(labelKey)}
          </span>
        );
      })}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden>🎂</span>
        {t("legend.birthdays")}
      </span>
    </div>
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
