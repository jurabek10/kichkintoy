"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { CalendarMonth } from "./calendar-month";
import { EventCard } from "./event-card";

export function ParentCalendar() {
  const { t } = useLayoutTranslation("calendar");
  const [month, setMonth] = useState(currentMonth());
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [childId, setChildId] = useState("all");
  const range = monthRange(month);
  const input = {
    from: range.from,
    to: range.to,
    childId: childId === "all" ? undefined : childId,
  };

  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(),
    queryFn: () => orpc.attendance.children(),
  });

  const { data: events = [], isPending, error } = useQuery({
    queryKey: queryKeys.calendar.parentList(input),
    queryFn: () => orpc.calendar.parentList(input),
  });

  const { data: upcoming = [] } = useQuery({
    queryKey: queryKeys.calendar.upcoming({
      childId: childId === "all" ? undefined : childId,
    }),
    queryFn: () =>
      orpc.calendar.upcoming({
        childId: childId === "all" ? undefined : childId,
        limit: 6,
      }),
  });

  const children = childrenQuery.data?.children ?? [];
  const selectedEvents = useMemo(
    () => events.filter((event) => event.startsAt.slice(0, 10) === selectedDate),
    [events, selectedDate],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("parentDescription")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allChildren")}</SelectItem>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setSelectedDate(`${event.target.value}-01`);
              }}
              className="w-[155px]"
            />
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
            {t("eventsOnDate", { date: selectedDate })}
          </h2>
          {isPending ? (
            <Card className="p-6 text-sm text-muted-foreground">
              {t("loading")}
            </Card>
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
  return new Date().toISOString().slice(0, 10);
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
