"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Users } from "lucide-react";
import type { TFunction } from "i18next";
import type {
  ClassListItem,
  DailyReportClassChildStatus,
  TeacherClass,
} from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { PageHeading } from "@/components/page-heading";
import { DatePicker } from "@/components/ui/date-picker";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { todayIsoDate } from "./report-utils";
import { TeacherDayReports } from "./teacher-day-reports";
import { ClassReports } from "./class-reports";

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

  // Most teachers run a single room. With nothing to choose between, the class
  // picker is pure friction — drop them straight into that class's report list
  // so "Reports" means "write today's reports". Two or more classes keep the
  // overview with the picker.
  if (!director && !loading && classes.length === 1) {
    return (
      <ClassReports
        centerId={centerId}
        classId={classes[0].id}
        initialDate={date}
        role="teacher"
        embedded
      />
    );
  }

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
        <TeacherDayReports
          classes={classes}
          reports={reports}
          date={date}
          loading={loading}
          t={t}
        />
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

