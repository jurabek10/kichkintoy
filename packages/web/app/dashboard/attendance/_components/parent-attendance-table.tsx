"use client";

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  IoAlertCircle,
  IoArrowDown,
  IoArrowUp,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoEllipseOutline,
  IoPersonOutline,
} from "react-icons/io5";
import type { IconType } from "react-icons";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatWeekdayShort } from "@/lib/date";
import { cn } from "@/lib/utils";

/** A normalized day for the month list — the web twin of the mobile model. */
export type AttendanceDay = {
  date: string;
  status: string;
  attended: boolean;
  checkInLabel: string | null;
  checkOutLabel: string | null;
  absenceReason: string | null;
  pickedUpBy: string | null;
  pickedUpRelationship: string | null;
  note: string | null;
};

const RELATIONSHIP_KEY: Record<string, string> = {
  mother: "parentHome.calendar.relationship.mother",
  father: "parentHome.calendar.relationship.father",
  grandparent: "parentHome.calendar.relationship.grandparent",
  other: "parentHome.calendar.relationship.other",
};

// Left→right from "here and fine" to "needs a look" — the order the status
// filter offers, and the order the legend reads in.
const STATUS_FILTER_ORDER = [
  "present",
  "late",
  "left_early",
  "picked_up",
  "excused",
  "absent",
];

type StatusVisual = {
  tile: string; // soft candy fill behind the date
  ink: string; // ink text for the tile + status glyph
  badgeBg: string; // soft surface behind the status glyph
  Glyph: IconType;
};

/** Status → one cohesive candy visual, shared by the date tile and the status
 *  glyph so a row reads as a single colour story. */
function statusVisual(day: AttendanceDay): StatusVisual {
  if (day.attended)
    return { tile: "bg-mint", ink: "text-mint-ink", badgeBg: "bg-mint", Glyph: IoCheckmarkCircle };
  if (day.status === "excused")
    return { tile: "bg-sunshine", ink: "text-sunshine-ink", badgeBg: "bg-sunshine", Glyph: IoAlertCircle };
  if (day.status === "absent")
    return { tile: "bg-coral", ink: "text-coral-ink", badgeBg: "bg-coral", Glyph: IoCloseCircle };
  return { tile: "bg-muted", ink: "text-muted-foreground", badgeBg: "bg-muted", Glyph: IoEllipseOutline };
}

/**
 * The full attendance month as a scannable TanStack table — the web counterpart
 * of the mobile day-card list. The signature is the status-tinted date tile in
 * the first column, which keeps the candy identity while the rest of the row
 * stays quiet and dense: status, the recorded in/out times, who collected the
 * child, and any reason or note. A status filter (only the statuses present that
 * month) lets a parent jump straight to, say, every absent day.
 */
export function ParentAttendanceTable({ days }: { days: AttendanceDay[] }) {
  const { t, i18n } = useLayoutTranslation("attendance");
  const { t: tApp } = useLayoutTranslation("app");
  const lang = i18n.language;

  const presentStatuses = useMemo(() => {
    const set = new Set(days.map((d) => d.status));
    return STATUS_FILTER_ORDER.filter((s) => set.has(s));
  }, [days]);

  const columns = useMemo<ColumnDef<AttendanceDay>[]>(
    () => [
      {
        id: "day",
        accessorFn: (day) => day.date,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.day")} />
        ),
        enableHiding: false,
        cell: ({ row }) => {
          const day = row.original;
          const v = statusVisual(day);
          const dayNum = Number(day.date.slice(8, 10));
          return (
            <div
              className={cn(
                "flex h-12 w-12 flex-col items-center justify-center rounded-xl",
                v.tile,
              )}
            >
              <span className={cn("text-[10px] font-bold uppercase leading-none", v.ink)}>
                {formatWeekdayShort(day.date, lang)}
              </span>
              <span className={cn("text-lg font-extrabold leading-tight", v.ink)}>
                {dayNum}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        filterFn: "equalsString",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => {
          const day = row.original;
          const v = statusVisual(day);
          return (
            <span className="inline-flex items-center gap-2">
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", v.badgeBg)}>
                <v.Glyph className={cn("h-4 w-4", v.ink)} />
              </span>
              <span className="font-semibold text-foreground">
                {t(`status.${day.status}`)}
              </span>
            </span>
          );
        },
      },
      {
        id: "times",
        enableSorting: false,
        header: () => <span>{t("table.times")}</span>,
        cell: ({ row }) => {
          const day = row.original;
          if (!day.checkInLabel && !day.checkOutLabel)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1 text-xs tabular-nums">
              {day.checkInLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <IoArrowDown className="h-3.5 w-3.5 text-mint-ink" />
                  <span className="text-muted-foreground">{t("table.inShort")}</span>
                  <span className="font-bold text-foreground">{day.checkInLabel}</span>
                </span>
              ) : null}
              {day.checkOutLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <IoArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("table.outShort")}</span>
                  <span className="font-bold text-foreground">{day.checkOutLabel}</span>
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "pickedUp",
        enableSorting: false,
        header: () => <span>{t("table.pickedUp")}</span>,
        cell: ({ row }) => {
          const day = row.original;
          if (!day.pickedUpBy)
            return <span className="text-muted-foreground">—</span>;
          const rel = day.pickedUpRelationship
            ? tApp(
                RELATIONSHIP_KEY[day.pickedUpRelationship] ??
                  "parentHome.calendar.relationship.other",
              )
            : null;
          return (
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted">
                <IoPersonOutline className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {day.pickedUpBy}
                </p>
                {rel ? (
                  <p className="text-[11px] text-muted-foreground">{rel}</p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "note",
        enableSorting: false,
        header: () => <span>{t("table.note")}</span>,
        cell: ({ row }) => {
          const day = row.original;
          const reason = day.status === "absent" ? day.absenceReason : null;
          if (!reason && !day.note)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex max-w-[28ch] flex-col gap-0.5">
              {reason ? (
                <span className="text-sm text-foreground">{reason}</span>
              ) : null}
              {day.note ? (
                <span className="text-xs text-muted-foreground">{day.note}</span>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t, tApp, lang],
  );

  return (
    <DataTable
      columns={columns}
      data={days}
      pageSize={10}
      emptyMessage={t("noMatchesTitle")}
      toolbar={(table) => {
        const statusFilter =
          (table.getColumn("status")?.getFilterValue() as string) ?? "all";
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                table
                  .getColumn("status")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                {presentStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }}
    />
  );
}
