"use client";

import Link from "next/link";
import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, PencilLine, Users } from "lucide-react";
import type { TFunction } from "i18next";
import type {
  ClassListItem,
  DailyReportListResponse,
  DailyReportSummary,
  TeacherClass,
} from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ReportChildCell,
  ReportContentCell,
  ReportStatusBadge,
  ReportTimeCell,
} from "./report-table-cells";

type ReportClass = Pick<TeacherClass | ClassListItem, "id" | "name" | "childCount">;

/**
 * The teacher's day: their classes across the top as a way *into* each room to
 * write reports, then every report for the chosen date in one table below.
 * Each class card links to that class's report page; the table is filtered by
 * class and child name from its own toolbar.
 */
export function TeacherDayReports({
  classes,
  reports,
  date,
  loading,
  t,
}: {
  classes: ReportClass[];
  reports: DailyReportListResponse;
  date: string;
  loading: boolean;
  t: TFunction<"reports">;
}) {
  // Reports published today, counted per class, so each card shows progress.
  const sentByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const report of reports) {
      if (report.status !== "published") continue;
      map.set(report.class.id, (map.get(report.class.id) ?? 0) + 1);
    }
    return map;
  }, [reports]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <KidsLoader label={t("loading")} size="sm" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ClassNavStrip
        classes={classes}
        sentByClass={sentByClass}
        date={date}
        t={t}
      />

      <Card>
        <CardContent className="p-4">
          <DayReportsTable classes={classes} reports={reports} t={t} />
        </CardContent>
      </Card>
    </div>
  );
}

/** The teacher's classes as cards that open each room's report page — the place
 *  where reports are actually written. A sent/total bar shows which room lags. */
function ClassNavStrip({
  classes,
  sentByClass,
  date,
  t,
}: {
  classes: ReportClass[];
  sentByClass: Map<string, number>;
  date: string;
  t: TFunction<"reports">;
}) {
  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("noClasses")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("classesHint")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((klass) => (
          <ClassNavCard
            key={klass.id}
            klass={klass}
            sent={sentByClass.get(klass.id) ?? 0}
            date={date}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function ClassNavCard({
  klass,
  sent,
  date,
  t,
}: {
  klass: ReportClass;
  sent: number;
  date: string;
  t: TFunction<"reports">;
}) {
  const total = klass.childCount;
  const pct = total > 0 ? Math.min(100, (sent / total) * 100) : 0;
  const allSent = total > 0 && sent >= total;
  return (
    <Link
      href={`/dashboard/reports/classes/${klass.id}?date=${date}`}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border bg-card p-4 transition",
        "hover:border-primary/50 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate font-bold">{klass.name}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {total}
        </span>
      </span>
      <span className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        {sent > 0 ? (
          <span
            className={cn(allSent ? "bg-mint" : "bg-sunshine")}
            style={{ width: `${pct}%` }}
          />
        ) : null}
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {t("overview.sent", { sent, total })}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-80 transition group-hover:opacity-100">
          <PencilLine className="h-3.5 w-3.5" />
          {t("writeReports")}
        </span>
      </span>
    </Link>
  );
}

function DayReportsTable({
  classes,
  reports,
  t,
}: {
  classes: ReportClass[];
  reports: DailyReportSummary[];
  t: TFunction<"reports">;
}) {
  const columns = useMemo<ColumnDef<DailyReportSummary>[]>(
    () => [
      {
        id: "child",
        accessorFn: (row) => row.child.name,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        cell: ({ row }) => (
          <ReportChildCell
            name={row.original.child.name}
            photoUrl={row.original.child.photoUrl}
          />
        ),
      },
      {
        id: "class",
        accessorFn: (row) => row.class.id,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.class")} />
        ),
        cell: ({ row }) => (
          <span className="truncate text-sm text-muted-foreground">
            {row.original.class.name}
          </span>
        ),
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id)),
      },
      {
        id: "content",
        enableSorting: false,
        header: t("table.content"),
        cell: ({ row }) => <ReportContentCell report={row.original} t={t} />,
      },
      {
        id: "time",
        accessorFn: (row) => row.publishedAt ?? row.updatedAt,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.time")} />
        ),
        cell: ({ row }) => <ReportTimeCell report={row.original} t={t} />,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) => <ReportStatusBadge report={row.original} t={t} />,
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id)),
      },
      {
        id: "action",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="block text-right">{t("table.actions")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/reports/${row.original.id}`}>
                <Eye className="h-4 w-4" />
                {t("table.view")}
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={reports}
      emptyMessage={t("noReportsForDate")}
      toolbar={(table) => (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={
                  (table.getColumn("child")?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn("child")?.setFilterValue(event.target.value)
                }
                placeholder={t("table.searchChild")}
                className="h-9 pl-9 sm:w-[240px]"
              />
            </div>
            {classes.length > 1 ? (
              <DataTableFacetedFilter
                column={table.getColumn("class")}
                title={t("table.class")}
                options={classes.map((klass) => ({
                  label: klass.name,
                  value: klass.id,
                }))}
              />
            ) : null}
            <DataTableFacetedFilter
              column={table.getColumn("status")}
              title={t("table.status")}
              options={[
                { label: t("filters.published"), value: "published" },
                { label: t("filters.draft"), value: "draft" },
                { label: t("filters.scheduled"), value: "scheduled" },
              ]}
            />
          </div>
          <DataTableViewOptions table={table} />
        </div>
      )}
    />
  );
}
