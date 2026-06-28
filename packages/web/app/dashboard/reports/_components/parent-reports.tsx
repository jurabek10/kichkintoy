"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, BookOpen, ImageIcon, MessageCircle, Search } from "lucide-react";
import type { DailyReportSummary } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { queryKeys } from "@/lib/query-keys";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Input } from "@/components/ui/input";
import { LoadingCard } from "@/components/loading-card";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeading } from "@/components/page-heading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import {
  formatDayOfMonth,
  formatTime,
  formatWeekdayShort,
} from "@/lib/format";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { TodayReport } from "./today-report";
import {
  currentMonth,
  moodEmoji,
  reportDayKey,
  reportItemSummary,
  reportMonthKey,
  reportTimestamp,
  todayKey,
} from "./report-utils";

type Period = "all" | "month";

export function ParentReports() {
  const { t } = useLayoutTranslation("reports");
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [month, setMonth] = useState(currentMonth());

  const {
    data: children = [],
    isPending: childrenLoading,
    error: childrenError,
  } = useQuery({
    queryKey: queryKeys.parent.children(),
    queryFn: () => orpc.reports.parentChildren(),
  });

  const effectiveChildId = selectedChildId ?? children[0]?.id ?? null;

  const {
    data: reports = [],
    isPending: reportsLoading,
    error: reportsError,
  } = useQuery({
    queryKey: queryKeys.parent.childReports(effectiveChildId ?? ""),
    queryFn: () => orpc.reports.parentList({ childId: effectiveChildId! }),
    enabled: !!effectiveChildId,
  });

  const loading = childrenLoading || (!!effectiveChildId && reportsLoading);
  const queryError = childrenError ?? reportsError;
  const error = queryError ? toApiError(queryError).message : null;
  const selectedChild = children.find((child) => child.id === effectiveChildId);

  const columns = useMemo<ColumnDef<DailyReportSummary>[]>(
    () => buildColumns(t, router),
    [t, router],
  );

  // Newest first so the table reads like a timeline running back from today.
  const byNewest = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          +new Date(reportTimestamp(b)) - +new Date(reportTimestamp(a)),
      ),
    [reports],
  );

  const today = todayKey();
  const todays = byNewest.filter(
    (report) => reportDayKey(reportTimestamp(report)) === today,
  );
  const featured = todays[0] ?? byNewest[0] ?? null;

  const query = search.trim().toLowerCase();
  const rows = byNewest.filter((report) => {
    if (period === "month" && reportMonthKey(reportTimestamp(report)) !== month) {
      return false;
    }
    if (query) {
      const haystack = [
        report.teacherNote,
        report.class.name,
        report.author.fullName,
        report.mood,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading
            Icon={BookOpen}
            tone="coral"
            title={t("title")}
            description={t("parentDescription")}
          />
          {children.length > 1 ? (
            <Select
              value={effectiveChildId ?? undefined}
              onValueChange={setSelectedChildId}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("children")} />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <LoadingCard label={t("loading")} />
      ) : children.length === 0 ? (
        <EmptyChildren t={t} />
      ) : (
        <>
          <TodayReport
            report={featured}
            isToday={todays.length > 0}
            childName={selectedChild?.name ?? null}
            t={t}
          />

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              {t("parent.allReports")}
            </h2>
            <Card>
              <CardContent className="p-4 sm:p-5">
                <DataTable
                  columns={columns}
                  data={rows}
                  pageSize={12}
                  emptyMessage={
                    reports.length === 0
                      ? t("noPublishedReports")
                      : t("parent.tableEmpty")
                  }
                  onRowClick={(report) =>
                    router.push(`/dashboard/reports/${report.id}`)
                  }
                  toolbar={() => (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder={t("parent.searchPlaceholder")}
                          className="h-9 w-[200px] pl-8"
                        />
                      </div>
                      <PeriodToggle
                        value={period}
                        onValueChange={setPeriod}
                        t={t}
                      />
                      {period === "month" ? (
                        <MonthPicker
                          value={month}
                          onValueChange={setMonth}
                          className="w-[160px]"
                        />
                      ) : null}
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function buildColumns(
  t: TFunction<"reports">,
  router: ReturnType<typeof useRouter>,
): ColumnDef<DailyReportSummary>[] {
  return [
    {
      id: "date",
      accessorFn: (report) => +new Date(reportTimestamp(report)),
      sortingFn: "basic",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("parent.colDate")} />
      ),
      cell: ({ row }) => {
        const date = reportTimestamp(row.original);
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-coral/10 leading-none">
              <span className="text-lg font-extrabold text-coral-ink">
                {formatDayOfMonth(date)}
              </span>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                {formatWeekdayShort(date)}
              </span>
            </div>
            <span className="text-xl" aria-hidden>
              {moodEmoji(row.original.mood)}
            </span>
          </div>
        );
      },
    },
    {
      id: "report",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("parent.colReport")} />
      ),
      cell: ({ row }) => {
        const report = row.original;
        return (
          <div className="min-w-0 max-w-[42ch]">
            <p className="truncate text-sm text-foreground">
              {report.teacherNote || reportItemSummary(report, t)}
            </p>
            <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold">{report.class.name}</span>
              {report.photoCount > 0 ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <ImageIcon className="h-3 w-3" />
                  {report.photoCount}
                </span>
              ) : null}
              {report.commentCount > 0 ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <MessageCircle className="h-3 w-3" />
                  {report.commentCount}
                </span>
              ) : null}
            </p>
          </div>
        );
      },
    },
    {
      id: "time",
      accessorFn: (report) => +new Date(reportTimestamp(report)),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("parent.colTime")} />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {formatTime(reportTimestamp(row.original))}
        </span>
      ),
    },
    {
      id: "open",
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">{t("parent.open")}</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/dashboard/reports/${row.original.id}`);
            }}
          >
            {t("parent.open")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

function PeriodToggle({
  value,
  onValueChange,
  t,
}: {
  value: Period;
  onValueChange: (value: Period) => void;
  t: TFunction<"reports">;
}) {
  const options: { key: Period; label: string }[] = [
    { key: "all", label: t("parent.periodAll") },
    { key: "month", label: t("parent.periodMonth") },
  ];
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onValueChange(option.key)}
          aria-pressed={value === option.key}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition",
            value === option.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EmptyChildren({ t }: { t: TFunction<"reports"> }) {
  return (
    <Card className="grid place-items-center gap-2 p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-coral/15">
        <BookOpen className="h-6 w-6 text-coral-ink" />
      </span>
      <p className="font-bold text-foreground">{t("parent.noChildrenTitle")}</p>
      <p className="max-w-[40ch] text-sm text-muted-foreground">
        {t("noLinkedChildren")}
      </p>
    </Card>
  );
}
