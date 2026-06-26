"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { PageHeading } from "@/components/page-heading";
import { MonthPicker } from "@/components/ui/month-picker";
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
import { formatDayMonth, formatMonthYear } from "@/lib/date";
import { CalendarLegend, CalendarMonth } from "./calendar-month";
import { CalendarEventTable } from "./calendar-event-table";

/**
 * One calendar surface for both staff and parents: a month grid that marks
 * event days and classmate birthdays, the month's events as a searchable table,
 * and a birthdays panel beside it. Parents filter by child and read only; staff
 * scope to their center and can create events. Clicking a day filters the table
 * to that day; the birthdays panel always shows the whole month.
 */
export function CalendarWorkspace({
  mode,
  centerId,
}: {
  mode: "staff" | "parent";
  centerId: string | null;
}) {
  const { t, i18n } = useLayoutTranslation("calendar");
  const isParent = mode === "parent";

  const [month, setMonth] = useState(currentMonth());
  // null = whole month; a date filters the events table to that single day.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [childId, setChildId] = useState("all");

  const childParam = childId === "all" ? undefined : childId;
  const range = monthRange(month);
  const dateRange = monthDateRange(month);
  const staffReady = isParent || !!centerId;

  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(),
    queryFn: () => orpc.attendance.children(),
    enabled: isParent,
  });
  const children = childrenQuery.data?.children ?? [];

  const eventsQuery = useQuery({
    queryKey: isParent
      ? queryKeys.calendar.parentList({ ...range, childId: childParam })
      : queryKeys.calendar.staffList({ centerId: centerId ?? "", ...range }),
    queryFn: () =>
      isParent
        ? orpc.calendar.parentList({ ...range, childId: childParam })
        : orpc.calendar.staffList({ centerId: centerId ?? "", ...range }),
    enabled: staffReady,
  });

  const birthdaysQuery = useQuery({
    queryKey: queryKeys.calendar.birthdays(
      isParent
        ? { childId: childParam, ...dateRange }
        : { centerId: centerId ?? "", ...dateRange },
    ),
    queryFn: () =>
      orpc.calendar.birthdays(
        isParent
          ? { childId: childParam, ...dateRange }
          : { centerId: centerId ?? "", ...dateRange },
      ),
    enabled: staffReady,
  });

  const events = eventsQuery.data ?? [];
  const birthdays = birthdaysQuery.data ?? [];

  const birthdayDates = useMemo(
    () => new Set(birthdays.map((birthday) => birthday.date)),
    [birthdays],
  );
  const visibleEvents = useMemo(
    () =>
      selectedDate
        ? events.filter((event) => event.startsAt.slice(0, 10) === selectedDate)
        : events,
    [events, selectedDate],
  );
  const visibleBirthdays = useMemo(
    () =>
      selectedDate
        ? birthdays.filter((birthday) => birthday.date === selectedDate)
        : birthdays,
    [birthdays, selectedDate],
  );

  if (!isParent && !centerId) {
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
            description={isParent ? t("parentDescription") : t("staffDescription")}
          />
          <div className="flex flex-wrap items-center gap-2">
            {isParent && children.length > 1 ? (
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger className="w-[170px]">
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
            ) : null}
            <MonthPicker
              value={month}
              onValueChange={(value) => {
                setMonth(value);
                setSelectedDate(null);
              }}
              className="w-[180px]"
            />
            {!isParent ? (
              <Button asChild>
                <Link href="/dashboard/calendar/new">
                  <Plus className="h-4 w-4" />
                  {t("newEvent")}
                </Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {eventsQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {toApiError(eventsQuery.error).message}
          </AlertDescription>
        </Alert>
      ) : null}

      <CalendarMonth
        month={month}
        events={events}
        birthdayDates={birthdayDates}
        selectedDate={selectedDate}
        onSelectDate={(date) =>
          setSelectedDate((current) => (current === date ? null : date))
        }
      />

      <CalendarLegend />

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
        {eventsQuery.isPending ? (
          <LoadingCard label={t("loading")} />
        ) : (
          <CalendarEventTable
            events={visibleEvents}
            birthdays={visibleBirthdays}
          />
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

/** Month bounds as ISO datetimes, for the events range. */
function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, monthIndex - 1, 1));
  const to = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Month bounds as date-only strings, for the birthdays range. */
function monthDateRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${month}-01`,
    to: `${year}-${pad(monthIndex)}-${pad(lastDay)}`,
  };
}
