"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  IoArrowForward,
  IoCalendarOutline,
  IoCheckmarkCircle,
  IoDocumentTextOutline,
  IoFemaleOutline,
  IoImagesOutline,
  IoMaleOutline,
  IoMedkitOutline,
  IoMegaphoneOutline,
  IoPeopleOutline,
  IoPersonAddOutline,
  IoRestaurantOutline,
  IoSunnyOutline,
  IoWalkOutline,
} from "react-icons/io5";
import type { IconType } from "react-icons";
import type {
  DailyReportClassChildStatus,
  MedicationRequestSummary,
  TeacherClass,
} from "@kichkintoy/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { formatWeekdayLong } from "@/lib/date";
import { cn } from "@/lib/utils";
import { todayIsoDate } from "../reports/_components/report-utils";

/**
 * Teacher home — the same world as the parent mobile app (candy tones, the
 * mobile's Ionicons), rebuilt as a desktop "how is my class today?" board. It
 * reads top-to-bottom like the phone: jump tiles, then today's attendance as a
 * single class pulse, then report progress, then the medicine a parent asked
 * the teacher to give. Every number is real (attendance, reports, medications
 * scoped to the teacher's classes), so the home never disagrees with the pages.
 */

type Tone = "coral" | "sky" | "grape" | "mint" | "sunshine" | "bubblegum";

/** The phone's tile palette, with the mobile app's Ionicons so a teacher sees
 *  the same glyphs on both screens. */
const QUICK_ACTIONS: Array<{
  href: string;
  labelKey: string;
  Icon: IconType;
  tone: Tone;
}> = [
  { href: "/dashboard/reports", labelKey: "items.reports", Icon: IoDocumentTextOutline, tone: "coral" },
  { href: "/dashboard/attendance", labelKey: "items.attendance", Icon: IoCalendarOutline, tone: "mint" },
  { href: "/dashboard/albums", labelKey: "items.albums", Icon: IoImagesOutline, tone: "grape" },
  { href: "/dashboard/notices", labelKey: "items.notices", Icon: IoMegaphoneOutline, tone: "sky" },
  { href: "/dashboard/meals", labelKey: "items.meals", Icon: IoRestaurantOutline, tone: "sunshine" },
  { href: "/dashboard/medications", labelKey: "items.medications", Icon: IoMedkitOutline, tone: "coral" },
  { href: "/dashboard/pickups", labelKey: "items.pickups", Icon: IoWalkOutline, tone: "sky" },
  { href: "/dashboard/classes", labelKey: "items.myClasses", Icon: IoPeopleOutline, tone: "mint" },
];

const TILE_TONES: Record<Tone, string> = {
  coral: "bg-coral text-coral-ink",
  sky: "bg-sky text-sky-ink",
  grape: "bg-grape text-grape-ink",
  mint: "bg-mint text-mint-ink",
  sunshine: "bg-sunshine text-sunshine-ink",
  bubblegum: "bg-bubblegum text-bubblegum-ink",
};

export function TeacherHome() {
  const { t, i18n } = useLayoutTranslation("app");
  const { t: tNav } = useLayoutTranslation("nav");
  const { session } = useSession();
  const date = todayIsoDate();
  const centerId = session?.membership.centerId ?? null;

  const classesQuery = useQuery({
    queryKey: queryKeys.teacher.classes(),
    queryFn: () => orpc.teacher.classes(),
  });
  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);

  // Today's attendance for the teacher's classes — the server scopes the list,
  // and its `summary` already aggregates present/late/absent across them.
  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance.staffList({ centerId: centerId ?? "", date }),
    queryFn: () =>
      orpc.attendance.staffList({ centerId: centerId ?? "", date }),
    enabled: !!centerId,
  });

  // Today's medication requests parents asked the teacher to give.
  const medsQuery = useQuery({
    queryKey: queryKeys.medications.staffList({ centerId: centerId ?? "", date }),
    queryFn: () =>
      orpc.medications.staffList({ centerId: centerId ?? "", date }),
    enabled: !!centerId,
  });

  // Per-class report completion for today — same source as the Reports page.
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
      return { klass, total, sent, loading: statusQueries[i]?.isPending ?? true };
    });
    // statusQueries is a fresh array each render; key off its settled state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, statusQueries.map((q) => `${q.isPending}:${q.dataUpdatedAt}`).join()]);

  const reportTotals = useMemo(() => {
    const sent = rows.reduce((sum, r) => sum + r.sent, 0);
    const expected = rows.reduce((sum, r) => sum + r.total, 0);
    return { sent, expected, pending: Math.max(0, expected - sent) };
  }, [rows]);

  // Class make-up — total children, free seats, and the boys/girls split. The
  // gender counts ride along on the per-class status data already fetched.
  const composition = useMemo(() => {
    let boys = 0;
    let girls = 0;
    classes.forEach((_klass, i) => {
      const data = (statusQueries[i]?.data ?? []) as DailyReportClassChildStatus[];
      for (const child of data) {
        if (child.gender === "boy") boys += 1;
        else if (child.gender === "girl") girls += 1;
      }
    });
    const children = classes.reduce((sum, k) => sum + k.childCount, 0);
    const capacity = classes.reduce((sum, k) => sum + (k.maxChildren ?? 0), 0);
    return {
      children,
      capacity,
      emptySeats: Math.max(0, capacity - children),
      boys,
      girls,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, statusQueries.map((q) => `${q.isPending}:${q.dataUpdatedAt}`).join()]);

  const statusLoading =
    classesQuery.isPending ||
    (classes.length > 0 && statusQueries.some((q) => q.isPending));

  if (!session) return null;

  const firstName =
    session.user.fullName.trim().split(/\s+/)[0] ?? session.user.fullName;
  const hour = new Date().getHours();
  const greetKey =
    hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening";

  const meds = (medsQuery.data ?? []) as MedicationRequestSummary[];

  return (
    <div className="flex flex-col gap-5">
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
          <IoSunnyOutline className="h-4 w-4" />
          {capitalize(formatWeekdayLong(new Date(), i18n.language))}
        </span>
      </header>

      {/* Quick actions — the phone's candy tiles, mobile glyphs. Full width. */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <SectionTitle
            title={t("dashboardHome.teacher.quickActions")}
            sub={t("dashboardHome.teacher.quickActionsSub")}
          />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href + action.labelKey}
                href={action.href}
                className="group flex flex-col items-center gap-2.5 rounded-2xl p-3 text-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5",
                    TILE_TONES[action.tone],
                  )}
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

      {/* Class make-up — children, free seats, boys/girls. */}
      <ClassOverviewCard
        loading={classesQuery.isPending}
        genderLoading={statusLoading}
        composition={composition}
        title={
          classes.length === 1
            ? classes[0].name
            : t("dashboardHome.teacher.classInfo.titleMulti")
        }
        t={t}
      />

      {/* Today's attendance — the class pulse. */}
      <AttendanceCard
        loading={attendanceQuery.isPending && !!centerId}
        summary={attendanceQuery.data?.summary}
        fallbackTotal={classes.reduce((s, k) => s + k.childCount, 0)}
        t={t}
      />

      {/* Today's reports — progress per class. */}
      <ReportsCard
        loading={classesQuery.isPending}
        statusLoading={statusLoading}
        classes={classes}
        rows={rows}
        totals={reportTotals}
        date={date}
        t={t}
      />

      {/* Medication today — what a parent asked the teacher to give. */}
      <MedicationsCard loading={medsQuery.isPending && !!centerId} meds={meds} t={t} />
    </div>
  );
}

/* --------------------------- Class overview --------------------------- */

function ClassOverviewCard({
  loading,
  genderLoading,
  composition,
  title,
  t,
}: {
  loading: boolean;
  genderLoading: boolean;
  composition: {
    children: number;
    capacity: number;
    emptySeats: number;
    boys: number;
    girls: number;
  };
  title: string;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  const { children, capacity, emptySeats, boys, girls } = composition;
  const genderTotal = boys + girls;

  return (
    <SectionCard
      Icon={IoPeopleOutline}
      tone="grape"
      title={title}
      sub={t("dashboardHome.teacher.classInfo.sub")}
      href="/dashboard/classes"
      cta={t("dashboardHome.teacher.classInfo.viewAll")}
    >
      {loading ? (
        <KidsLoader label={t("loading")} size="sm" className="py-4" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoTile
              Icon={IoPeopleOutline}
              tone="grape"
              value={children}
              label={t("dashboardHome.teacher.classInfo.children")}
            />
            <InfoTile
              Icon={IoPersonAddOutline}
              tone="mint"
              value={capacity > 0 ? emptySeats : "—"}
              label={t("dashboardHome.teacher.classInfo.emptySeats")}
            />
            <InfoTile
              Icon={IoMaleOutline}
              tone="sky"
              value={genderLoading ? "—" : boys}
              label={t("dashboardHome.teacher.classInfo.boys")}
            />
            <InfoTile
              Icon={IoFemaleOutline}
              tone="bubblegum"
              value={genderLoading ? "—" : girls}
              label={t("dashboardHome.teacher.classInfo.girls")}
            />
          </div>

          {!genderLoading && genderTotal > 0 ? (
            <div
              className="flex h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={t("dashboardHome.teacher.classInfo.ratio", {
                boys,
                girls,
              })}
            >
              <div className="bg-sky" style={{ width: `${(boys / genderTotal) * 100}%` }} />
              <div className="bg-bubblegum" style={{ width: `${(girls / genderTotal) * 100}%` }} />
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

function InfoTile({
  Icon,
  tone,
  value,
  label,
}: {
  Icon: IconType;
  tone: Tone;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5">
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
          TILE_TONES[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Attendance ----------------------------- */

function AttendanceCard({
  loading,
  summary,
  fallbackTotal,
  t,
}: {
  loading: boolean;
  summary:
    | {
        total: number;
        present: number;
        late: number;
        absent: number;
        excused: number;
        leftEarly: number;
        pickedUp: number;
        notCheckedIn: number;
      }
    | undefined;
  fallbackTotal: number;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  const total = summary?.total ?? fallbackTotal;
  const here = summary
    ? summary.present + summary.late + summary.leftEarly + summary.pickedUp
    : 0;
  const present = summary
    ? summary.present + summary.leftEarly + summary.pickedUp
    : 0;
  const late = summary?.late ?? 0;
  const absent = summary ? summary.absent + summary.excused : 0;
  const notIn = summary?.notCheckedIn ?? 0;
  const allHere = !loading && total > 0 && here === total;

  const segments = [
    { value: present, className: "stroke-mint" },
    { value: late, className: "stroke-sunshine" },
    { value: absent, className: "stroke-coral" },
    { value: notIn, className: "stroke-muted-foreground/25" },
  ];

  return (
    <SectionCard
      Icon={IoCalendarOutline}
      tone="mint"
      title={t("dashboardHome.teacher.attendance.title")}
      sub={t("dashboardHome.teacher.attendance.sub")}
      href="/dashboard/attendance"
      cta={t("dashboardHome.teacher.attendance.viewAll")}
    >
      {loading ? (
        <KidsLoader label={t("loading")} size="sm" className="py-4" />
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
          <DonutChart segments={segments}>
            <div>
              <p className="text-3xl font-bold leading-none tabular-nums text-foreground">
                {here}
                <span className="text-lg text-muted-foreground">/{total}</span>
              </p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("dashboardHome.teacher.attendance.here")}
              </p>
            </div>
          </DonutChart>

          <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:flex-1">
            <Legend dot="bg-mint" label={t("dashboardHome.teacher.attendance.here")} value={present} />
            <Legend dot="bg-sunshine" label={t("dashboardHome.teacher.attendance.late")} value={late} />
            <Legend dot="bg-coral" label={t("dashboardHome.teacher.attendance.absent")} value={absent} />
            <Legend
              dot="bg-muted-foreground/30"
              label={t("dashboardHome.teacher.attendance.notIn")}
              value={notIn}
            />
            {allHere ? (
              <p className="col-span-2 inline-flex items-center gap-1.5 text-sm font-semibold text-mint-ink">
                <IoCheckmarkCircle className="h-4 w-4" />
                {t("dashboardHome.teacher.attendance.allHere")}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

/* ------------------------------ Reports ------------------------------- */

function ReportsCard({
  loading,
  statusLoading,
  classes,
  rows,
  totals,
  date,
  t,
}: {
  loading: boolean;
  statusLoading: boolean;
  classes: TeacherClass[];
  rows: Array<{ klass: TeacherClass; total: number; sent: number; loading: boolean }>;
  totals: { sent: number; expected: number; pending: number };
  date: string;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  const pct =
    totals.expected > 0 ? Math.round((totals.sent / totals.expected) * 100) : 0;
  const pending = Math.max(0, totals.expected - totals.sent);

  return (
    <SectionCard
      Icon={IoDocumentTextOutline}
      tone="coral"
      title={t("dashboardHome.teacher.todayReports")}
      sub={t("dashboardHome.teacher.todayReportsSub")}
      href="/dashboard/reports"
      cta={t("dashboardHome.teacher.viewAll")}
      meta={
        statusLoading
          ? undefined
          : t("dashboardHome.teacher.sent", {
              sent: totals.sent,
              total: totals.expected,
            })
      }
    >
      {loading ? (
        <KidsLoader label={t("loading")} size="sm" className="py-4" />
      ) : classes.length === 0 ? (
        <EmptyRow
          Icon={IoPeopleOutline}
          tone="sky"
          title={t("dashboardHome.teacher.noClasses")}
          sub={t("dashboardHome.teacher.noClassesSub")}
        />
      ) : (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
          <div className="flex shrink-0 flex-col items-center gap-3 sm:w-[150px]">
            <DonutChart
              segments={[
                { value: totals.sent, className: "stroke-mint" },
                { value: pending, className: "stroke-coral" },
              ]}
            >
              <p className="text-3xl font-bold leading-none tabular-nums text-foreground">
                {pct}
                <span className="text-lg text-muted-foreground">%</span>
              </p>
            </DonutChart>
            <div className="flex flex-col gap-1.5">
              <Legend
                dot="bg-mint"
                label={t("dashboardHome.teacher.stat.reportsSent")}
                value={totals.sent}
              />
              <Legend
                dot="bg-coral"
                label={t("dashboardHome.teacher.stat.reportsPending")}
                value={pending}
              />
            </div>
          </div>

          <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
            {rows.map((row) => (
              <ClassReportRow
                key={row.klass.id}
                klass={row.klass}
                sent={row.sent}
                total={row.total}
                loading={row.loading}
                date={date}
                sentLabel={t("dashboardHome.teacher.sent", { sent: row.sent, total: row.total })}
                allSentLabel={t("dashboardHome.teacher.allSent")}
                childrenLabel={t("dashboardHome.teacher.childrenCount", {
                  count: row.klass.childCount,
                })}
              />
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
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
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold",
                done ? "bg-mint text-mint-ink" : "bg-secondary text-foreground",
              )}
            >
              {done ? (
                <IoCheckmarkCircle className="h-5 w-5" />
              ) : (
                klass.name.trim().charAt(0).toUpperCase() || "—"
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
            className={cn(
              "h-full rounded-full transition-all",
              done ? "bg-mint-ink/70" : "bg-primary",
            )}
            style={{ width: `${loading ? 0 : pct}%` }}
          />
        </div>
      </Link>
    </li>
  );
}

/* ---------------------------- Medications ----------------------------- */

const MED_STATUS_TONE: Record<string, "warning" | "success" | "secondary"> = {
  pending: "warning",
  administered: "success",
  skipped: "secondary",
  cancelled: "secondary",
};

function MedicationsCard({
  loading,
  meds,
  t,
}: {
  loading: boolean;
  meds: MedicationRequestSummary[];
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  const pending = meds.filter((m) => m.status === "pending").length;
  return (
    <SectionCard
      Icon={IoMedkitOutline}
      tone="coral"
      title={t("dashboardHome.teacher.medications.title")}
      sub={t("dashboardHome.teacher.medications.sub")}
      href="/dashboard/medications"
      cta={t("dashboardHome.teacher.medications.viewAll")}
      meta={
        !loading && pending > 0
          ? t("dashboardHome.teacher.medications.toGive", { count: pending })
          : undefined
      }
    >
      {loading ? (
        <KidsLoader label={t("loading")} size="sm" className="py-4" />
      ) : meds.length === 0 ? (
        <EmptyRow
          Icon={IoMedkitOutline}
          tone="mint"
          title={t("dashboardHome.teacher.medications.empty")}
          sub={t("dashboardHome.teacher.medications.emptySub")}
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {meds.slice(0, 5).map((med) => (
            <li key={med.id}>
              <Link
                href="/dashboard/medications"
                className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {med.child.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {med.medicationType} · {med.dosage} ·{" "}
                    {t("dashboardHome.teacher.medications.atTime", {
                      time: med.medicationTime,
                    })}
                  </p>
                </div>
                <Badge variant={MED_STATUS_TONE[med.status] ?? "secondary"}>
                  {t(`dashboardHome.teacher.medications.status.${med.status}`, {
                    defaultValue: med.status,
                  })}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ------------------------------ Shared -------------------------------- */

/** A full-width info section: tinted glyph, title/sub, an optional metric, and
 *  a "open the page" link — the repeating shape that makes the home scan. */
function SectionCard({
  Icon,
  tone,
  title,
  sub,
  href,
  cta,
  meta,
  children,
}: {
  Icon: IconType;
  tone: Tone;
  title: string;
  sub: string;
  href: string;
  cta: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                TILE_TONES[tone],
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <span className="truncate">{title}</span>
                {meta ? (
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold tabular-nums text-muted-foreground">
                    {meta}
                  </span>
                ) : null}
              </h3>
              <p className="truncate text-sm text-muted-foreground">{sub}</p>
            </div>
          </div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <span className="hidden sm:inline">{cta}</span>
            <IoArrowForward className="h-4 w-4" />
          </Link>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function EmptyRow({
  Icon,
  tone,
  title,
  sub,
}: {
  Icon: IconType;
  tone: Tone;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-8 text-center">
      <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", TILE_TONES[tone])}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-1 font-semibold text-foreground">{title}</p>
      <p className="max-w-[28ch] text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

/** A dependency-free SVG donut. Segments are drawn clockwise from the top over
 *  a muted track; whatever is passed as children sits in the hole (the headline
 *  number). Colors come from Tailwind `stroke-*` classes so they track theme. */
function DonutChart({
  segments,
  size = 132,
  thickness = 14,
  children,
}: {
  segments: Array<{ value: number; className: string }>;
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const total = Math.max(
    1,
    segments.reduce((sum, s) => sum + Math.max(0, s.value), 0),
  );
  const r = 50 - thickness / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          strokeWidth={thickness}
          className="stroke-muted"
        />
        {segments.map((seg, i) => {
          const value = Math.max(0, seg.value);
          if (value === 0) return null;
          const length = (value / total) * circumference;
          const dash = (
            <circle
              key={i}
              cx={50}
              cy={50}
              r={r}
              fill="none"
              strokeWidth={thickness}
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-offset}
              className={seg.className}
            />
          );
          offset += length;
          return dash;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children}
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
