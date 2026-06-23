"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Users } from "lucide-react";
import type { TFunction } from "i18next";
import type {
  ClassListItem,
  DailyReportClassChildStatus,
  DailyReportListResponse,
  TeacherClass,
} from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { PageHeading } from "@/components/page-heading";
import { DatePicker } from "@/components/ui/date-picker";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { formatDate, reportStatusLabel } from "@/lib/format";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { reportItemSummary, todayIsoDate } from "./report-utils";

export function StaffReports({
  centerId,
  director,
}: {
  centerId: string | null;
  director: boolean;
}) {
  const { t } = useLayoutTranslation("reports");
  const [date, setDate] = useState(todayIsoDate());

  const {
    data,
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: queryKeys.reports.staffDashboard({ director, centerId, date }),
    queryFn: async () => {
      const classRows = director
        ? centerId
          ? await orpc.director.classes({ centerId })
          : []
        : await orpc.teacher.classes();
      const reportRows = director
        ? []
        : await orpc.reports.teacherList({ reportDate: date });
      const classes = director
        ? (classRows as ClassListItem[]).filter(
            (klass) => klass.status !== "archived",
          )
        : classRows;
      return {
        classes: classes as Array<TeacherClass | ClassListItem>,
        reports: reportRows,
      };
    },
  });

  const classes = data?.classes ?? [];
  const reports = data?.reports ?? [];
  const error = loadError ? toApiError(loadError).message : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading
            Icon={BookOpen}
            tone="coral"
            title={t("title")}
            description={t("staffDescription")}
          />
          <div className="flex items-center gap-2">
            <DatePicker
              value={date}
              onValueChange={setDate}
              className="w-[160px]"
            />
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {director ? (
        <DirectorReportsOverview
          classes={classes as ClassListItem[]}
          date={date}
          loading={loading}
          t={t}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <StaffClassesCard classes={classes} date={date} loading={loading} t={t} />
          <StaffReportsCard date={date} loading={loading} reports={reports} t={t} />
        </div>
      )}
    </div>
  );
}

type ClassStat = {
  total: number;
  published: number;
  drafts: number;
  loading: boolean;
};

/** The director's day across classes: a summary strip plus a completion card
 *  per class, so it's obvious which rooms have sent reports and which lag. */
function DirectorReportsOverview({
  classes,
  date,
  loading,
  t,
}: {
  classes: ClassListItem[];
  date: string;
  loading: boolean;
  t: TFunction<"reports">;
}) {
  const statusQueries = useQueries({
    queries: classes.map((klass) => ({
      queryKey: queryKeys.teacher.classReportStatuses(klass.id, date),
      queryFn: () =>
        orpc.reports.classStatuses({ classId: klass.id, reportDate: date }),
    })),
  });

  const stats = useMemo(() => {
    const map = new Map<string, ClassStat>();
    classes.forEach((klass, index) => {
      const query = statusQueries[index];
      const rows = (query?.data ?? []) as DailyReportClassChildStatus[];
      map.set(klass.id, {
        total: rows.length || klass.childCount,
        published: rows.filter((row) => row.report?.status === "published")
          .length,
        drafts: rows.filter(
          (row) => row.report && row.report.status !== "published",
        ).length,
        loading: query?.isPending ?? true,
      });
    });
    return map;
    // statusQueries is a fresh array each render; key off its data/pending state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, statusQueries.map((q) => `${q.isPending}:${q.dataUpdatedAt}`).join()]);

  const totals = useMemo(() => {
    let published = 0;
    let drafts = 0;
    for (const stat of stats.values()) {
      published += stat.published;
      drafts += stat.drafts;
    }
    return { published, drafts };
  }, [stats]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <KidsLoader label={t("loading")} size="sm" />
        </CardContent>
      </Card>
    );
  }

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
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label={t("classes")} value={classes.length} />
        <StatTile
          label={t("overview.reportsSent")}
          value={totals.published}
          tone="mint"
        />
        <StatTile
          label={t("overview.draftsPending")}
          value={totals.drafts}
          tone="sunshine"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((klass) => (
          <ClassCompletionCard
            key={klass.id}
            klass={klass}
            stat={stats.get(klass.id)}
            date={date}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function ClassCompletionCard({
  klass,
  stat,
  date,
  t,
}: {
  klass: ClassListItem;
  stat: ClassStat | undefined;
  date: string;
  t: TFunction<"reports">;
}) {
  const total = stat?.total ?? klass.childCount;
  const published = stat?.published ?? 0;
  const drafts = stat?.drafts ?? 0;
  const isLoading = stat?.loading ?? true;
  const allSent = !isLoading && total > 0 && published === total;
  const pubPct = total > 0 ? (published / total) * 100 : 0;
  const draftPct = total > 0 ? (drafts / total) * 100 : 0;

  return (
    <Link
      href={`/dashboard/reports/classes/${klass.id}?date=${date}`}
      className="block"
    >
      <Card className="h-full transition hover:border-primary/40 hover:shadow-pop">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold">{klass.name}</p>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {t("childrenCount", { count: klass.childCount })}
              </p>
            </div>
            {allSent ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-ink" />
            ) : null}
          </div>

          <div className="mt-auto flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                {t("overview.sentLabel")}
              </span>
              <span className="tabular-nums font-bold">
                {isLoading ? "—" : t("overview.sent", { sent: published, total })}
              </span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
              {!isLoading && published > 0 ? (
                <div className="bg-mint" style={{ width: `${pubPct}%` }} />
              ) : null}
              {!isLoading && drafts > 0 ? (
                <div className="bg-sunshine" style={{ width: `${draftPct}%` }} />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {statusLine({ isLoading, published, drafts, allSent, t })}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function statusLine({
  isLoading,
  published,
  drafts,
  allSent,
  t,
}: {
  isLoading: boolean;
  published: number;
  drafts: number;
  allSent: boolean;
  t: TFunction<"reports">;
}) {
  if (isLoading) return t("loading");
  if (allSent) return t("overview.allSent");
  if (drafts > 0) return t("overview.drafts", { count: drafts });
  if (published === 0) return t("overview.noReports");
  return t("overview.sentSoFar", { count: published });
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "mint" | "sunshine";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "h-9 w-1.5 rounded-full",
            tone === "mint"
              ? "bg-mint"
              : tone === "sunshine"
                ? "bg-sunshine"
                : "bg-primary",
          )}
        />
        <div>
          <p className="tabular-nums text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StaffClassesCard({
  classes,
  date,
  loading,
  t,
}: {
  classes: Array<TeacherClass | ClassListItem>;
  date: string;
  loading: boolean;
  t: TFunction<"reports">;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("classes")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <KidsLoader label={t("loading")} size="sm" />
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noClasses")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((klass) => (
              <Link
                key={klass.id}
                href={`/dashboard/reports/classes/${klass.id}?date=${date}`}
                className="rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{klass.name}</p>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("childrenCount", { count: klass.childCount })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffReportsCard({
  date,
  loading,
  reports,
  t,
}: {
  date: string;
  loading: boolean;
  reports: DailyReportListResponse;
  t: TFunction<"reports">;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("reportsForDate", { date: formatDate(date) })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <KidsLoader label={t("loading")} size="sm" />
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noReportsForDate")}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {reports.map((report) => (
              <li key={report.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{report.child.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.class.name} · {reportItemSummary(report, t)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      report.status === "published"
                        ? "success"
                        : report.status === "scheduled"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {t(`status.${report.status}`, reportStatusLabel(report.status))}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
