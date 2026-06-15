"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { MonthPicker } from "@/components/ui/month-picker";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDayMonth } from "@/lib/date";
import { CalendarMonth } from "./calendar-month";
import { EventCard } from "./event-card";

export function StaffCalendar({
  centerId,
}: {
  centerId: string | null;
  role: string;
}) {
  const { t, i18n } = useLayoutTranslation("calendar");
  const [month, setMonth] = useState(currentMonth());
  const [selectedDate, setSelectedDate] = useState(todayIso());
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

  const { data: upcoming = [] } = useQuery({
    queryKey: queryKeys.calendar.upcoming({ centerId: centerId ?? "" }),
    queryFn: () =>
      orpc.calendar.upcoming({ centerId: centerId ?? "", limit: 6 }),
    enabled: !!centerId,
  });

  const selectedEvents = useMemo(
    () => events.filter((event) => event.startsAt.slice(0, 10) === selectedDate),
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
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("staffDescription")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker
              value={month}
              onValueChange={(value) => {
                setMonth(value);
                setSelectedDate(`${value}-01`);
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
        onSelectDate={setSelectedDate}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold">
            {t("eventsOnDate", { date: formatDayMonth(selectedDate, i18n.language) })}
          </h2>
          {isPending ? (
            <LoadingCard label={t("loading")} />
          ) : selectedEvents.length === 0 ? (
            <EmptyState text={t("noEventsForDate")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold">{t("upcoming")}</h2>
          {upcoming.length === 0 ? (
            <EmptyState text={t("noUpcomingEvents")} />
          ) : (
            <div className="grid gap-3">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="grid place-items-center gap-2 p-8 text-center">
      <CalendarDays className="h-8 w-8 text-muted-foreground" />
      <p className="font-semibold">{text}</p>
    </Card>
  );
}

function todayIso() {
  // Local date so the default selection lines up with the (local) calendar grid.
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
