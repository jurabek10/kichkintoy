"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { PageHeading } from "@/components/page-heading";
import { MonthPicker } from "@/components/ui/month-picker";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDayMonth, formatMonthYear } from "@/lib/date";
import { CalendarMonth } from "./calendar-month";
import { CalendarEventTable } from "./calendar-event-table";

export function StaffCalendar({
  centerId,
}: {
  centerId: string | null;
  role: string;
}) {
  const { t, i18n } = useLayoutTranslation("calendar");
  const [month, setMonth] = useState(currentMonth());
  // null = whole month; a date filters the table to that single day.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const range = monthRange(month);
  const input = {
    centerId: centerId ?? "",
    from: range.from,
    to: range.to,
  };

  const { data: events = [], isPending, error } = useQuery({
    queryKey: queryKeys.calendar.staffList(input),
    queryFn: () => orpc.calendar.staffList(input),
    enabled: !!centerId,
  });

  const visibleEvents = useMemo(
    () =>
      selectedDate
        ? events.filter((event) => event.startsAt.slice(0, 10) === selectedDate)
        : events,
    [events, selectedDate],
  );

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading
            Icon={CalendarDays}
            tone="grape"
            title={t("title")}
            description={t("staffDescription")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker
              value={month}
              onValueChange={(value) => {
                setMonth(value);
                setSelectedDate(null);
              }}
              className="w-[180px]"
            />
            <Button asChild>
              <Link href="/dashboard/calendar/new">
                <Plus className="h-4 w-4" />
                {t("newEvent")}
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <CalendarMonth
        month={month}
        events={events}
        selectedDate={selectedDate}
        onSelectDate={(date) =>
          setSelectedDate((current) => (current === date ? null : date))
        }
      />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">
            {selectedDate
              ? t("eventsOnDate", {
                  date: formatDayMonth(selectedDate, i18n.language),
                })
              : formatMonthYear(month, i18n.language)}
          </h2>
          {selectedDate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground"
              onClick={() => setSelectedDate(null)}
            >
              <X className="h-3.5 w-3.5" />
              {t("showWholeMonth")}
            </Button>
          ) : null}
        </div>
        {isPending ? (
          <LoadingCard label={t("loading")} />
        ) : (
          <CalendarEventTable events={visibleEvents} />
        )}
      </section>
    </div>
  );
}

function todayIso() {
  // Local date so the default month lines up with the (local) calendar grid.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function currentMonth() {
  return todayIso().slice(0, 7);
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, monthIndex - 1, 1));
  const to = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString() };
}
