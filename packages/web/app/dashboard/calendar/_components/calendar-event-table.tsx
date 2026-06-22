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
import type { CalendarEventSummary } from "@kichkintoy/shared";
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
}: {
  events: CalendarEventSummary[];
}) {
  const { t, i18n } = useLayoutTranslation("calendar");
  const router = useRouter();
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<CalendarEventSummary>[]>(
    () => [
      {
        id: "when",
        accessorFn: (event) => event.startsAt,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.when")} />
        ),
        cell: ({ row }) => {
          const event = row.original;
          const date = event.startsAt.slice(0, 10);
          return (
            <div className="flex items-center gap-3">
              <div className="flex w-9 shrink-0 flex-col items-center leading-none">
                <span className="text-lg font-extrabold tabular-nums">
                  {Number(date.slice(8, 10))}
                </span>
                <span className="mt-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  {formatWeekdayShort(event.startsAt, i18n.language)}
                </span>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {event.allDay ? t("allDay") : formatTime(event.startsAt)}
              </span>
            </div>
          );
        },
        sortingFn: (left, right) =>
          left.original.startsAt.localeCompare(right.original.startsAt),
      },
      {
        id: "event",
        accessorFn: (event) => event.title,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.event")} />
        ),
        cell: ({ row }) => {
          const event = row.original;
          const audience = AUDIENCE[event.audienceType];
          const Icon = audience.icon;
          const cancelled = event.status === "cancelled";
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
                {event.title}
              </span>
            </div>
          );
        },
        sortingFn: (left, right) =>
          left.original.title.localeCompare(right.original.title),
      },
      {
        id: "audience",
        accessorFn: (event) => eventContext(event, t),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.audience")} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {eventContext(row.original, t)}
          </span>
        ),
      },
      {
        id: "location",
        accessorFn: (event) => event.locationText ?? "",
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.location")} />
        ),
        cell: ({ row }) =>
          row.original.locationText ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {row.original.locationText}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "status",
        accessorFn: (event) => event.status,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "cancelled" ? "destructive" : "secondary"
            }
          >
            {t(eventStatusKey(row.original))}
          </Badge>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">{t("open")}</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-primary hover:text-primary"
            >
              <Link
                href={`/dashboard/calendar/${row.original.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                {t("open")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [t, i18n.language],
  );

  const query = search.trim().toLowerCase();
  const rows = query
    ? events.filter((event) => event.title.toLowerCase().includes(query))
    : events;

  return (
    <DataTable
      columns={columns}
      data={rows}
      pageSize={10}
      emptyMessage={t("noEventsThisMonth")}
      onRowClick={(event) => router.push(`/dashboard/calendar/${event.id}`)}
      rowClassName={(event) =>
        isPast(event.startsAt) ? "opacity-50" : undefined
      }
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

function eventStatusKey(event: CalendarEventSummary) {
  if (event.status === "cancelled") return "status.cancelled";
  return event.seenByMe ? "status.seen" : "status.scheduled";
}

function isPast(startsAt: string) {
  return startsAt.slice(0, 10) < toLocalIso(new Date());
}

function toLocalIso(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
