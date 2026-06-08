"use client";

import type { CalendarEventSummary } from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonth({
  month,
  events,
  selectedDate,
  onSelectDate,
}: {
  month: string;
  events: CalendarEventSummary[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const days = monthDays(month);
  const eventCounts = new Map<string, number>();
  for (const event of events) {
    const key = event.startsAt.slice(0, 10);
    eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-semibold text-muted-foreground">
        {weekdays.map((day) => (
          <div key={day} className="px-2 py-3">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) =>
          day ? (
            <Button
              key={day}
              type="button"
              variant="ghost"
              className={cn(
                "h-20 rounded-none border-b border-r p-2 text-left align-top",
                selectedDate === day && "bg-accent text-accent-foreground",
              )}
              onClick={() => onSelectDate(day)}
            >
              <span className="flex h-full w-full flex-col items-start justify-between">
                <span className="font-semibold">{Number(day.slice(8, 10))}</span>
                {eventCounts.get(day) ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                    {eventCounts.get(day)}
                  </span>
                ) : null}
              </span>
            </Button>
          ) : (
            <div key={`empty-${index}`} className="h-20 border-b border-r" />
          ),
        )}
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
  return value.toISOString().slice(0, 10);
}
