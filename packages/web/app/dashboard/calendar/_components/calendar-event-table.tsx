"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  ChevronRight,
  MapPin,
  Search,
  Smile,
  Users,
} from "lucide-react";
import type {
  CalendarBirthdayEntry,
  CalendarEventSummary,
} from "@kichkintoy/shared";
import { ChildAvatar } from "@/components/child-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatTime, formatWeekdayShort } from "@/lib/date";
import { cn } from "@/lib/utils";
import { eventContext } from "./event-card";

/** A single agenda line — either a staff event or a classmate birthday — so the
 *  month reads as one chronological schedule, the way the mobile app shows it. */
type ScheduleRow =
  | {
      kind: "event";
      id: string;
      date: string;
      sortKey: string;
      title: string;
      event: CalendarEventSummary;
    }
  | {
      kind: "birthday";
      id: string;
      date: string;
      sortKey: string;
      title: string;
      birthday: CalendarBirthdayEntry;
    };

/** Audience → leading glyph + pastel tint. The icon names who the event is for,
 *  so the colour isn't the only signal (matches the mobile schedule rows). */
const AUDIENCE: Record<
  CalendarEventSummary["audienceType"],
  { icon: typeof Building2; chip: string }
> = {
  center: { icon: Building2, chip: "bg-sky/15 text-sky-ink" },
  class: { icon: Users, chip: "bg-grape/15 text-grape-ink" },
  child: { icon: Smile, chip: "bg-mint/15 text-mint-ink" },
};

export function CalendarEventTable({
  events,
  birthdays,
}: {
  events: CalendarEventSummary[];
  birthdays: CalendarBirthdayEntry[];
}) {
  const { t, i18n } = useLayoutTranslation("calendar");
  const lang = i18n.language;
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Merge events and birthdays into one chronological list. Birthdays and
  // all-day events sort before timed events on the same day.
  const rows = useMemo<ScheduleRow[]>(() => {
    const eventRows: ScheduleRow[] = events.map((event) => {
      const date = event.startsAt.slice(0, 10);
      return {
        kind: "event",
        id: event.id,
        date,
        sortKey: `${date} ${event.allDay ? "0" : `1 ${formatTime(event.startsAt)}`}`,
        title: event.title,
        event,
      };
    });
    const birthdayRows: ScheduleRow[] = birthdays.map((birthday) => ({
      kind: "birthday",
      id: `bday-${birthday.childId}-${birthday.date}`,
      date: birthday.date,
      sortKey: `${birthday.date} 0`,
      title: birthday.childName,
      birthday,
    }));
    return [...eventRows, ...birthdayRows].sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey),
    );
  }, [events, birthdays]);

  const columns = useMemo<ColumnDef<ScheduleRow>[]>(
    () => [
      {
        id: "when",
        accessorFn: (row) => row.sortKey,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.when")} />
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex w-9 shrink-0 flex-col items-center leading-none">
                <span className="text-lg font-extrabold tabular-nums">
                  {Number(item.date.slice(8, 10))}
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  {formatWeekdayShort(item.date, lang)}
                </span>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {item.kind === "event"
                  ? item.event.allDay
                    ? t("allDay")
                    : formatTime(item.event.startsAt)
                  : ""}
              </span>
            </div>
          );
        },
        sortingFn: (left, right) =>
          left.original.sortKey.localeCompare(right.original.sortKey),
      },
      {
        id: "event",
        accessorFn: (row) => row.title,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.event")} />
        ),
        cell: ({ row }) => {
          const item = row.original;
          if (item.kind === "birthday") {
            return (
              <div className="flex min-w-0 items-center gap-3">
                <BirthdayAvatar
                  name={item.birthday.childName}
                  photoUrl={item.birthday.photoUrl}
                  own={item.birthday.isOwnChild}
                />
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate font-semibold">
                    <span aria-hidden>🎂</span>
                    {item.birthday.childName}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t("turns", { age: item.birthday.turningAge })}
                  </span>
                </div>
              </div>
            );
          }
          const audience = AUDIENCE[item.event.audienceType];
          const Icon = audience.icon;
          const cancelled = item.event.status === "cancelled";
          return (
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                  audience.chip,
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span
                className={cn(
                  "truncate font-semibold",
                  cancelled && "text-muted-foreground line-through",
                )}
              >
                {item.event.title}
              </span>
            </div>
          );
        },
        sortingFn: (left, right) =>
          left.original.title.localeCompare(right.original.title),
      },
      {
        id: "audience",
        accessorFn: (row) =>
          row.kind === "event"
            ? eventContext(row.event, t)
            : (row.birthday.className ?? ""),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.audience")} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.kind === "event"
              ? eventContext(row.original.event, t)
              : (row.original.birthday.className ?? "—")}
          </span>
        ),
      },
      {
        id: "location",
        accessorFn: (row) =>
          row.kind === "event" ? (row.event.locationText ?? "") : "",
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.location")} />
        ),
        cell: ({ row }) => {
          const item = row.original;
          return item.kind === "event" && item.event.locationText ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {item.event.locationText}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => (row.kind === "event" ? row.event.status : "birthday"),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => {
          const item = row.original;
          if (item.kind === "birthday") {
            return item.birthday.isOwnChild ? (
              <span className="inline-flex items-center rounded-full bg-coral/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-coral-ink">
                {t("yourChild")}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            );
          }
          return (
            <Badge
              variant={
                item.event.status === "cancelled" ? "destructive" : "secondary"
              }
            >
              {t(eventStatusKey(item.event))}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">{t("open")}</span>,
        cell: ({ row }) =>
          row.original.kind === "event" ? (
            <div className="text-right">
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-primary hover:text-primary"
              >
                <Link
                  href={`/dashboard/calendar/${row.original.event.id}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {t("open")}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, lang],
  );

  const query = search.trim().toLowerCase();
  const filtered = query
    ? rows.filter((row) => row.title.toLowerCase().includes(query))
    : rows;

  return (
    <DataTable
      columns={columns}
      data={filtered}
      pageSize={12}
      emptyMessage={t("noEventsThisMonth")}
      onRowClick={(row) => {
        if (row.kind === "event") {
          router.push(`/dashboard/calendar/${row.event.id}`);
        }
      }}
      rowClassName={(row) => (isPast(row.date) ? "opacity-50" : undefined)}
      toolbar={(table) => (
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchEvents")}
              className="h-9 w-[220px] pl-8"
            />
          </div>
          <DataTableViewOptions table={table} />
        </div>
      )}
    />
  );
}

function BirthdayAvatar({
  name,
  photoUrl,
  own,
}: {
  name: string;
  photoUrl: string | null;
  own: boolean;
}) {
  return (
    <ChildAvatar
      name={name}
      photoUrl={photoUrl}
      className={cn(
        "h-9 w-9 bg-grape/20 text-xs text-grape-ink",
        own && "ring-2 ring-coral-ink ring-offset-1 ring-offset-card",
      )}
    />
  );
}

function eventStatusKey(event: CalendarEventSummary) {
  if (event.status === "cancelled") return "status.cancelled";
  return event.seenByMe ? "status.seen" : "status.scheduled";
}

function isPast(date: string) {
  return date < toLocalIso(new Date());
}

function toLocalIso(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
