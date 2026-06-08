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
import { Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { CalendarMonth } from "./calendar-month";
import { EventCard } from "./event-card";

export function StaffCalendar({
  centerId,
}: {
  centerId: string | null;
  role: string;
}) {
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
        <AlertDescription>
          Your account is not linked to a center yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Calendar</CardTitle>
            <CardDescription>
              Plan center, class, and child-specific events.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setSelectedDate(`${event.target.value}-01`);
              }}
              className="w-[155px]"
            />
            <Button asChild>
              <Link href="/dashboard/calendar/new">
                <Plus className="h-4 w-4" />
                New event
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
          <h2 className="text-base font-bold">Events on {selectedDate}</h2>
          {isPending ? (
            <Card className="p-6 text-sm text-muted-foreground">Loading...</Card>
          ) : selectedEvents.length === 0 ? (
            <EmptyState text="No events for this date" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold">Upcoming</h2>
          {upcoming.length === 0 ? (
            <EmptyState text="No upcoming events" />
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
