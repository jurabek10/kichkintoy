"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Eye, FileText, Plus, Search, Send } from "lucide-react";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import type {
  AttendanceRecordSummary,
  DailyReportClassChildStatus,
} from "@kichkintoy/shared";
import { queryKeys } from "@/lib/query-keys";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { ChildAvatar } from "@/components/child-avatar";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { formatDate } from "@/lib/format";
import { formatTime as formatClock } from "@/lib/date";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import {
  ReportChildCell,
  ReportContentCell,
  ReportStatusBadge,
  ReportTimeCell,
  newReportHref,
} from "./report-table-cells";

export function ClassReports({
  centerId,
  classId,
  initialDate,
  role,
  embedded = false,
}: {
  centerId: string | null;
  classId: string;
  initialDate: string;
  role: string;
  /** Rendered as the Reports landing page itself (single-class teacher), so the
   *  "back to reports" link would point at this same page — hide it. */
  embedded?: boolean;
}) {
  const { t } = useLayoutTranslation("reports");
  const queryClient = useQueryClient();
  const [date, setDate] = useState(initialDate);
  const [actionError, setActionError] = useState<string | null>(null);

  const rowsKey = queryKeys.teacher.classReportStatuses(classId, date);

  const {
    data: rows = [],
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: rowsKey,
    queryFn: () =>
      orpc.reports.classStatuses({ classId, reportDate: date }),
  });

  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance.staffList({
      centerId: centerId ?? "",
      classId,
      date,
    }),
    queryFn: () =>
      orpc.attendance.staffList({
        centerId: centerId ?? "",
        classId,
        date,
      }),
    // Both rooms need attendance: the director builds the whole table from it,
    // and the teacher uses it to mark absent children read-only.
    enabled: !!centerId,
  });

  // Children marked absent for the day — a teacher shouldn't draft a report for
  // a child who wasn't there, so these rows go read-only and sink to the bottom.
  const absentChildIds = useMemo(() => {
    const ids = new Set<string>();
    for (const record of attendanceQuery.data?.records ?? []) {
      if (record.status === "absent") ids.add(record.child.id);
    }
    return ids;
  }, [attendanceQuery.data]);

  const bulkMutation = useMutation({
    mutationFn: () =>
      orpc.reports.bulkCreateDrafts({ classId, body: { reportDate: date } }),
    onSuccess: async (result) => {
      toast.success(t("createdDrafts", { count: result.created }));
      await queryClient.invalidateQueries({ queryKey: rowsKey });
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      orpc.reports.publishDrafts({ classId, body: { reportDate: date } }),
    onSuccess: async (result) => {
      toast.success(t("publishedReports", { count: result.published }));
      await queryClient.invalidateQueries({ queryKey: rowsKey });
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const working = bulkMutation.isPending || publishMutation.isPending;
  const directorView = role === "director";
  const error =
    actionError ??
    (loadError ? toApiError(loadError).message : null) ??
    // Attendance only blocks the director's table; for the teacher it's an
    // optional enhancement, so don't fail the page if it errors.
    (directorView && attendanceQuery.error
      ? toApiError(attendanceQuery.error).message
      : null);

  function bulkCreate() {
    setActionError(null);
    bulkMutation.mutate();
  }

  function publishDrafts() {
    setActionError(null);
    publishMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      {embedded ? null : (
        <Link
          href="/dashboard/reports"
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("classReports")}</CardTitle>
            <CardDescription>
              {directorView
                ? t("directorClassDescription", { date: formatDate(date) })
                : t("teacherClassDescription", { date: formatDate(date) })}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={date}
              onValueChange={setDate}
              className="w-[160px]"
            />
            {!directorView ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={bulkCreate}
                  disabled={working}
                >
                  <Plus className="h-4 w-4" />
                  {t("createDrafts")}
                </Button>
                <Button type="button" onClick={publishDrafts} disabled={working}>
                  <Send className="h-4 w-4" />
                  {t("publishDrafts")}
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {directorView ? (
        <DirectorClassReportTable
          attendanceLoading={attendanceQuery.isPending}
          attendanceRecords={attendanceQuery.data?.records ?? []}
          date={date}
          reportRows={rows}
          t={t}
        />
      ) : (
        <TeacherClassReportTable
          date={date}
          loading={loading}
          rows={rows}
          absentChildIds={absentChildIds}
          t={t}
        />
      )}
    </div>
  );
}

type DirectorReportRow = {
  childId: string;
  childName: string;
  childPhotoUrl: string | null;
  className: string;
  birthday: string | null;
  checkedInAt: string | null;
  report: DailyReportClassChildStatus["report"];
};

const checkedInStatuses = new Set([
  "present",
  "late",
  "left_early",
  "picked_up",
]);

function DirectorClassReportTable({
  attendanceLoading,
  attendanceRecords,
  date,
  reportRows,
  t,
}: {
  attendanceLoading: boolean;
  attendanceRecords: AttendanceRecordSummary[];
  date: string;
  reportRows: DailyReportClassChildStatus[];
  t: TFunction<"reports">;
}) {
  const rows = useMemo(() => {
    const reportsByChild = new Map(reportRows.map((row) => [row.id, row]));
    return attendanceRecords
      .filter(
        (record) =>
          Boolean(record.checkedInAt) || checkedInStatuses.has(record.status),
      )
      .map((record) => {
        const reportRow = reportsByChild.get(record.child.id);
        return {
          childId: record.child.id,
          childName: record.child.name,
          childPhotoUrl: record.child.photoUrl,
          className: record.className ?? reportRow?.class.name ?? t("directorTable.class"),
          birthday: reportRow?.dateOfBirth ?? null,
          checkedInAt: record.checkedInAt,
          report: reportRow?.report ?? null,
        };
      });
  }, [attendanceRecords, reportRows]);

  const publishedCount = rows.filter(
    (row) => row.report?.status === "published",
  ).length;
  const missingCount = rows.filter((row) => !row.report).length;

  const columns = useMemo<ColumnDef<DirectorReportRow>[]>(
    () => [
      {
        accessorKey: "childName",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("directorTable.name")}
          />
        ),
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2.5">
            <ChildAvatar
              name={row.original.childName}
              photoUrl={row.original.childPhotoUrl}
            />
            <span className="truncate font-semibold">
              {row.original.childName}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "className",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("directorTable.class")}
          />
        ),
        cell: ({ row }) => (
          <p className="truncate text-sm text-muted-foreground">
            {row.original.className}
          </p>
        ),
      },
      {
        accessorKey: "birthday",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("directorTable.birthday")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.birthday)}</span>
        ),
      },
      {
        accessorKey: "checkedInAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("directorTable.checkIn")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm">{formatTime(row.original.checkedInAt)}</span>
        ),
      },
      {
        id: "reportStatus",
        accessorFn: (row) => row.report?.status ?? "missing",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("directorTable.report")}
          />
        ),
        cell: ({ row }) => <ReportStatusBadge report={row.original.report} t={t} />,
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id)),
      },
      {
        id: "action",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          row.original.report ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/reports/${row.original.report.id}`}>
                <FileText className="h-4 w-4" />
                {t("directorTable.detail")}
              </Link>
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("directorTable.noReport")}
            </span>
          ),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ReportMetric label={t("metrics.attended")} value={rows.length} />
        <ReportMetric label={t("metrics.published")} value={publishedCount} />
        <ReportMetric label={t("metrics.missing")} value={missingCount} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-base">{t("directorTable.title")}</CardTitle>
            <CardDescription>
              {t("directorTable.description", { date: formatDate(date) })}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {attendanceLoading ? (
            <KidsLoader label={t("loading")} size="sm" className="p-6" />
          ) : (
            <div className="p-4">
              <DataTable
                columns={columns}
                data={rows}
                emptyMessage={t("directorTable.empty")}
                toolbar={(table) => (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={
                            (table
                              .getColumn("childName")
                              ?.getFilterValue() as string) ?? ""
                          }
                          onChange={(event) =>
                            table
                              .getColumn("childName")
                              ?.setFilterValue(event.target.value)
                          }
                          placeholder={t("directorTable.search")}
                          className="h-9 pl-9 sm:w-[240px]"
                        />
                      </div>
                      <DataTableFacetedFilter
                        column={table.getColumn("reportStatus")}
                        title={t("directorTable.report")}
                        options={[
                          {
                            label: t("filters.published"),
                            value: "published",
                          },
                          { label: t("filters.draft"), value: "draft" },
                          {
                            label: t("filters.scheduled"),
                            value: "scheduled",
                          },
                          { label: t("filters.missing"), value: "missing" },
                        ]}
                      />
                    </div>
                    <DataTableViewOptions table={table} />
                  </div>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatClock(date);
}

/**
 * The teacher's class table: every enrolled child, whether or not a report
 * exists yet. Children still missing a report sit up top with a "New report"
 * button; sent and draft rows show their content (photos, comments, items) and
 * the time they reached parents. Name search and a status filter sit in the
 * toolbar. The running "#" counts across pages, so after filtering it doubles
 * as a count.
 */
function TeacherClassReportTable({
  date,
  loading,
  rows,
  absentChildIds,
  t,
}: {
  date: string;
  loading: boolean;
  rows: DailyReportClassChildStatus[];
  absentChildIds: Set<string>;
  t: TFunction<"reports">;
}) {
  const total = rows.length;
  const sent = rows.filter((row) => row.report?.status === "published").length;
  // "Missing" is a child who was present but has no report yet — an absent
  // child isn't expected to have one, so they don't count against the teacher.
  const missing = rows.filter(
    (row) => !row.report && !absentChildIds.has(row.id),
  ).length;

  // Present children first (in their given order), absent children last.
  const sortedRows = useMemo(() => {
    return [...rows].sort(
      (a, b) =>
        Number(absentChildIds.has(a.id)) - Number(absentChildIds.has(b.id)),
    );
  }, [rows, absentChildIds]);

  const columns = useMemo<ColumnDef<DailyReportClassChildStatus>[]>(
    () => [
      {
        id: "index",
        header: () => (
          <span className="text-muted-foreground" aria-label="#">
            #
          </span>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row, table }) => {
          const position =
            table.getSortedRowModel().rows.findIndex((r) => r.id === row.id) + 1;
          return (
            <span className="nums tabular-nums text-sm font-semibold text-muted-foreground">
              {position}
            </span>
          );
        },
      },
      {
        id: "child",
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.child")} />
        ),
        cell: ({ row }) => (
          <ReportChildCell
            name={row.original.name}
            photoUrl={row.original.photoUrl}
          />
        ),
      },
      {
        id: "content",
        enableSorting: false,
        header: t("table.content"),
        cell: ({ row }) => (
          <ReportContentCell report={row.original.report} t={t} />
        ),
      },
      {
        id: "time",
        accessorFn: (row) =>
          row.report?.publishedAt ?? row.report?.updatedAt ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.time")} />
        ),
        cell: ({ row }) => <ReportTimeCell report={row.original.report} t={t} />,
      },
      {
        id: "status",
        accessorFn: (row) =>
          row.report?.status ??
          (absentChildIds.has(row.id) ? "absent" : "missing"),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        cell: ({ row }) =>
          !row.original.report && absentChildIds.has(row.original.id) ? (
            <Badge variant="outline" className="text-muted-foreground">
              {t("table.absent")}
            </Badge>
          ) : (
            <ReportStatusBadge report={row.original.report} t={t} />
          ),
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id)),
      },
      {
        id: "action",
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <span className="block text-right">{t("table.actions")}</span>
        ),
        cell: ({ row }) => {
          const isAbsent = absentChildIds.has(row.original.id);
          return (
            <div className="flex justify-end">
              {row.original.report ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/reports/${row.original.report.id}`}>
                    <Eye className="h-4 w-4" />
                    {t("directorTable.detail")}
                  </Link>
                </Button>
              ) : isAbsent ? (
                // Absent today: no report to write, so the row is read-only.
                <span className="text-sm text-muted-foreground">
                  {t("table.absent")}
                </span>
              ) : (
                <Button asChild size="sm">
                  <Link
                    href={newReportHref({
                      childId: row.original.id,
                      childName: row.original.name,
                      centerId: row.original.centerId,
                      reportDate: date,
                    })}
                  >
                    <Plus className="h-4 w-4" />
                    {t("newReport")}
                  </Link>
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [t, date, absentChildIds],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ReportMetric label={t("metrics.enrolled")} value={total} />
        <ReportMetric label={t("metrics.published")} value={sent} />
        <ReportMetric label={t("metrics.missing")} value={missing} />
      </div>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <KidsLoader label={t("loading")} size="sm" className="p-6" />
          ) : (
            <DataTable
              columns={columns}
              data={sortedRows}
              emptyMessage={t("noChildrenInClass")}
              rowClassName={(row) =>
                absentChildIds.has(row.id) ? "opacity-60" : undefined
              }
              toolbar={(table) => (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={
                          (table
                            .getColumn("child")
                            ?.getFilterValue() as string) ?? ""
                        }
                        onChange={(event) =>
                          table
                            .getColumn("child")
                            ?.setFilterValue(event.target.value)
                        }
                        placeholder={t("table.searchChild")}
                        className="h-9 pl-9 sm:w-[240px]"
                      />
                    </div>
                    <DataTableFacetedFilter
                      column={table.getColumn("status")}
                      title={t("table.status")}
                      options={[
                        { label: t("filters.published"), value: "published" },
                        { label: t("filters.draft"), value: "draft" },
                        { label: t("filters.scheduled"), value: "scheduled" },
                        { label: t("filters.missing"), value: "missing" },
                        { label: t("table.absent"), value: "absent" },
                      ]}
                    />
                  </div>
                  <DataTableViewOptions table={table} />
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
