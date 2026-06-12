"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowLeft, FileText, Plus, Search, Send } from "lucide-react";
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
import { formatDate, reportStatusLabel } from "@/lib/format";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";

export function ClassReports({
  centerId,
  classId,
  initialDate,
  role,
}: {
  centerId: string | null;
  classId: string;
  initialDate: string;
  role: string;
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
    enabled: role === "director" && !!centerId,
  });

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
  const error =
    actionError ??
    (loadError ? toApiError(loadError).message : null) ??
    (attendanceQuery.error ? toApiError(attendanceQuery.error).message : null);

  const directorView = role === "director";

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
      <Link
        href="/dashboard/reports"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

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
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
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
        <ClassReportRows date={date} loading={loading} rows={rows} t={t} />
      )}
    </div>
  );
}

type DirectorReportRow = {
  childId: string;
  childName: string;
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
          className: record.className ?? reportRow?.class.name ?? t("directorTable.class"),
          birthday: reportRow?.dateOfBirth ?? null,
          checkedInAt: record.checkedInAt,
          report: reportRow?.report ?? null,
        };
      });
  }, [attendanceRecords, reportRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.childName.toLowerCase().includes(query) ||
        row.className.toLowerCase().includes(query);
      const reportStatus = row.report?.status ?? "missing";
      const matchesStatus =
        statusFilter === "all" || reportStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const publishedCount = rows.filter(
    (row) => row.report?.status === "published",
  ).length;
  const missingCount = rows.filter((row) => !row.report).length;

  const columns = useMemo<ColumnDef<DirectorReportRow>[]>(
    () => [
      {
        accessorKey: "childName",
        header: t("directorTable.name"),
        cell: ({ row }) => (
          <p className="truncate font-semibold">{row.original.childName}</p>
        ),
      },
      {
        accessorKey: "className",
        header: t("directorTable.class"),
        cell: ({ row }) => (
          <p className="truncate text-sm text-muted-foreground">
            {row.original.className}
          </p>
        ),
      },
      {
        accessorKey: "birthday",
        header: t("directorTable.birthday"),
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.birthday)}</span>
        ),
      },
      {
        accessorKey: "checkedInAt",
        header: t("directorTable.checkIn"),
        cell: ({ row }) => (
          <span className="text-sm">{formatTime(row.original.checkedInAt)}</span>
        ),
      },
      {
        id: "reportStatus",
        header: t("directorTable.report"),
        cell: ({ row }) => <ReportStatusBadge report={row.original.report} t={t} />,
      },
      {
        id: "action",
        header: "",
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

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ReportMetric label={t("metrics.attended")} value={rows.length} />
        <ReportMetric label={t("metrics.published")} value={publishedCount} />
        <ReportMetric label={t("metrics.missing")} value={missingCount} />
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">{t("directorTable.title")}</CardTitle>
            <CardDescription>
              {t("directorTable.description", { date: formatDate(date) })}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("directorTable.search")}
                className="pl-9 sm:w-[240px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allReports")}</SelectItem>
                <SelectItem value="published">{t("filters.published")}</SelectItem>
                <SelectItem value="draft">{t("filters.draft")}</SelectItem>
                <SelectItem value="scheduled">{t("filters.scheduled")}</SelectItem>
                <SelectItem value="missing">{t("filters.missing")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {attendanceLoading ? (
            <p className="p-6 text-sm text-muted-foreground">{t("loading")}</p>
          ) : filteredRows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("directorTable.empty")}
            </p>
          ) : (
            <table className="w-full table-fixed text-sm">
              <thead className="border-y bg-muted/40 text-left">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-semibold">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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

function ReportStatusBadge({
  report,
  t,
}: {
  report: DailyReportClassChildStatus["report"];
  t: TFunction<"reports">;
}) {
  if (!report) return <Badge variant="destructive">{t("filters.missing")}</Badge>;
  return (
    <Badge
      variant={
        report.status === "published"
          ? "success"
          : report.status === "scheduled"
            ? "warning"
            : "secondary"
      }
    >
      {t(`status.${report.status}`, { defaultValue: reportStatusLabel(report.status) })}
    </Badge>
  );
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ClassReportRows({
  date,
  loading,
  rows,
  t,
}: {
  date: string;
  loading: boolean;
  rows: DailyReportClassChildStatus[];
  t: TFunction<"reports">;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {t("noChildrenInClass")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {rows.map((row) => (
              <ClassReportRow key={row.id} date={date} row={row} t={t} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ClassReportRow({
  date,
  row,
  t,
}: {
  date: string;
  row: DailyReportClassChildStatus;
  t: TFunction<"reports">;
}) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">{row.name}</p>
        <p className="text-sm text-muted-foreground">
          {row.report
            ? `${t("summary.items", { count: row.report.itemCount })} · ${t("readCount", { read: row.report.readCount, total: row.report.guardianCount })}`
            : t("directorTable.noReport")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {row.report ? (
          <>
            <Badge
              variant={
                row.report.status === "published"
                  ? "success"
                  : row.report.status === "scheduled"
                    ? "warning"
                    : "secondary"
              }
            >
              {t(`status.${row.report.status}`, {
                defaultValue: reportStatusLabel(row.report.status),
              })}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/reports/${row.report.id}`}>
                <FileText className="h-4 w-4" />
                {t("directorTable.detail")}
              </Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm">
            <Link
              href={`/dashboard/reports/new?childId=${row.id}&centerId=${row.centerId}&reportDate=${date}`}
            >
              <Plus className="h-4 w-4" />
              {t("newReport")}
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}
