"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Images,
  Pill,
  School,
  Sun,
  UserCheck,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type {
  DailyReportClassChildStatus,
  TeacherClass,
} from "@kichkintoy/shared";
import { Card, CardContent } from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { formatWeekdayLong } from "@/lib/date";
import { todayIsoDate } from "../reports/_components/report-utils";

/**
 * Teacher home — the mobile parent app's world, rethought for a desktop the
 * teacher actually works in. The phone's signature carries over verbatim: the
 * candy quick-action tiles. Around them, a desktop earns its width with two
 * things the phone can't show at a glance — a live "today" strip and a
 * side-by-side "which classes still need reports" panel, both driven by real
 * data (the teacher's classes + per-class report completion for today).
 */

/** The phone's tile palette, applied to the teacher's most-used jumps. The
 *  `tone` keys map to candy CSS tokens (see globals.css teacher theme). */
const QUICK_ACTIONS: Array<{
  href: string;
  labelKey: string;
  Icon: LucideIcon;
  tone: Tone;
}> = [
  { href: "/dashboard/reports", labelKey: "items.reports", Icon: BookOpen, tone: "coral" },
  { href: "/dashboard/attendance", labelKey: "items.attendance", Icon: ClipboardCheck, tone: "mint" },
  { href: "/dashboard/albums", labelKey: "items.albums", Icon: Images, tone: "grape" },
  { href: "/dashboard/notices", labelKey: "items.notices", Icon: Bell, tone: "sky" },
  { href: "/dashboard/meals", labelKey: "items.meals", Icon: Utensils, tone: "sunshine" },
  { href: "/dashboard/medications", labelKey: "items.medications", Icon: Pill, tone: "coral" },
  { href: "/dashboard/pickups", labelKey: "items.pickups", Icon: UserCheck, tone: "sky" },
  { href: "/dashboard/classes", labelKey: "items.myClasses", Icon: School, tone: "mint" },
];

type Tone = "coral" | "sky" | "grape" | "mint" | "sunshine";

const TILE_TONES: Record<Tone, string> = {
  coral: "bg-coral text-coral-ink",
  sky: "bg-sky text-sky-ink",
  grape: "bg-grape text-grape-ink",
  mint: "bg-mint text-mint-ink",
  sunshine: "bg-sunshine text-sunshine-ink",
};

export function TeacherHome() {
  const { t, i18n } = useLayoutTranslation("app");
  const { t: tNav } = useLayoutTranslation("nav");
  const { session } = useSession();
  const date = todayIsoDate();

  const classesQuery = useQuery({
    queryKey: queryKeys.teacher.classes(),
    queryFn: () => orpc.teacher.classes(),
  });
  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);

  // Per-class report completion for today — the same source the Reports page
  // uses, so the home and that page never disagree.
  const statusQueries = useQueries({
    queries: classes.map((klass) => ({
      queryKey: queryKeys.teacher.classReportStatuses(klass.id, date),
      queryFn: () =>
        orpc.reports.classStatuses({ classId: klass.id, reportDate: date }),
      enabled: classes.length > 0,
    })),
  });

  const rows = useMemo(() => {
    return classes.map((klass, i) => {
      const data = (statusQueries[i]?.data ?? []) as DailyReportClassChildStatus[];
      const total = data.length || klass.childCount;
      const sent = data.filter((r) => r.report?.status === "published").length;
      return {
        klass,
        total,
        sent,
        loading: statusQueries[i]?.isPending ?? true,
      };
    });
    // statusQueries is a fresh array each render; key off its settled state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, statusQueries.map((q) => `${q.isPending}:${q.dataUpdatedAt}`).join()]);

  const totals = useMemo(() => {
    const children = classes.reduce((sum, k) => sum + k.childCount, 0);
    const sent = rows.reduce((sum, r) => sum + r.sent, 0);
    const expected = rows.reduce((sum, r) => sum + r.total, 0);
    return { children, sent, pending: Math.max(0, expected - sent) };
  }, [classes, rows]);

  // The two report numbers only settle once the per-class status calls land —
  // keep them as a placeholder until then so they don't flash 0 → real.
  const statusLoading =
    classesQuery.isPending ||
    (classes.length > 0 && statusQueries.some((q) => q.isPending));

  if (!session) return null;

  const firstName =
    session.user.fullName.trim().split(/\s+/)[0] ?? session.user.fullName;
  const hour = new Date().getHours();
  const greetKey =
    hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening";
  const language = i18n.language;

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting — real name + center, with the phone's sunshine "today" chip. */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            {t(`dashboardHome.teacher.${greetKey}`, { name: firstName })}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {session.membership.centerName
              ? t("dashboardHome.teacher.subtitle", {
                  center: session.membership.centerName,
                })
              : t("dashboardHome.teacher.subtitleNoCenter")}
          </p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-sunshine px-3.5 py-2 text-sm font-semibold text-sunshine-ink">
          <Sun className="h-4 w-4" />
          {capitalize(formatWeekdayLong(new Date(), language))}
        </span>
      </header>

      {/* "Today" strip — four glanceable numbers. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t("dashboardHome.teacher.stat.classes")}
          value={classes.length}
          Icon={School}
          tone="sky"
          loading={classesQuery.isPending}
        />
        <StatTile
          label={t("dashboardHome.teacher.stat.children")}
          value={totals.children}
          Icon={Users}
          tone="grape"
          loading={classesQuery.isPending}
        />
        <StatTile
          label={t("dashboardHome.teacher.stat.reportsSent")}
          value={totals.sent}
          Icon={CheckCircle2}
          tone="mint"
          loading={statusLoading}
        />
        <StatTile
          label={t("dashboardHome.teacher.stat.reportsPending")}
          value={totals.pending}
          Icon={FileText}
          tone="coral"
          loading={statusLoading}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(320px,380px)]">
        {/* Signature — the phone's candy quick-action tiles. */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-foreground">
                {t("dashboardHome.teacher.quickActions")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("dashboardHome.teacher.quickActionsSub")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href + action.labelKey}
                  href={action.href}
                  className="group flex flex-col items-center gap-2.5 rounded-2xl p-3 text-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={`grid h-14 w-14 place-items-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5 ${
                      TILE_TONES[action.tone]
                    }`}
                  >
                    <action.Icon className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {tNav(action.labelKey)}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's reports — which rooms are done, which still need writing. */}
        <Card>
          <CardContent className="flex h-full flex-col p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("dashboardHome.teacher.todayReports")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("dashboardHome.teacher.todayReportsSub")}
                </p>
              </div>
              <Link
                href="/dashboard/reports"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {t("dashboardHome.teacher.viewAll")}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {classesQuery.isPending ? (
              <KidsLoader label={t("loading")} size="sm" />
            ) : classes.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky text-sky-ink">
                  <School className="h-6 w-6" />
                </span>
                <p className="mt-1 font-semibold text-foreground">
                  {t("dashboardHome.teacher.noClasses")}
                </p>
                <p className="max-w-[24ch] text-sm text-muted-foreground">
                  {t("dashboardHome.teacher.noClassesSub")}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {rows.map((row) => (
                  <ClassReportRow
                    key={row.klass.id}
                    klass={row.klass}
                    sent={row.sent}
                    total={row.total}
                    loading={row.loading}
                    date={date}
                    sentLabel={t("dashboardHome.teacher.sent", {
                      sent: row.sent,
                      total: row.total,
                    })}
                    allSentLabel={t("dashboardHome.teacher.allSent")}
                    childrenLabel={t("dashboardHome.teacher.childrenCount", {
                      count: row.klass.childCount,
                    })}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClassReportRow({
  klass,
  sent,
  total,
  loading,
  date,
  sentLabel,
  allSentLabel,
  childrenLabel,
}: {
  klass: TeacherClass;
  sent: number;
  total: number;
  loading: boolean;
  date: string;
  sentLabel: string;
  allSentLabel: string;
  childrenLabel: string;
}) {
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  const done = !loading && total > 0 && sent >= total;

  return (
    <li>
      <Link
        href={`/dashboard/reports/classes/${klass.id}?date=${date}`}
        className="group flex flex-col gap-2 rounded-2xl border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                done ? "bg-mint text-mint-ink" : "bg-secondary text-foreground"
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                (klass.name.trim().charAt(0).toUpperCase() || "—")
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{klass.name}</p>
              <p className="truncate text-xs text-muted-foreground">{childrenLabel}</p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
            {loading ? "—" : done ? allSentLabel : sentLabel}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              done ? "bg-mint-ink/70" : "bg-primary"
            }`}
            style={{ width: `${loading ? 0 : pct}%` }}
          />
        </div>
      </Link>
    </li>
  );
}

function StatTile({
  label,
  value,
  Icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  tone: Tone;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TILE_TONES[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
            {loading ? "—" : value}
          </p>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function capitalize(s: string) {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
