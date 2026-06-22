"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileWarning,
  GraduationCap,
  Images,
  Inbox,
  Mail,
  Megaphone,
  School,
  UserPlus,
  Users,
  Utensils,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { DirectorHomeSummary } from "@kichkintoy/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/loading-card";
import { KidSun, KidCloud, KidBalloon } from "@/components/kids-decor";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ParentHome } from "./parent-home";

const KidsToys3D = dynamic(
  () => import("@/components/kids-3d").then((m) => m.KidsToys3D),
  { ssr: false },
);

export function DashboardHome() {
  const { t } = useLayoutTranslation("app");
  const { session } = useSession();
  if (!session) return null;

  const role = session.user.role;

  // Parents get the dedicated, feed-first home.
  if (role === "parent") {
    return <ParentHome />;
  }

  if (role === "director") {
    return (
      <DirectorHome
        centerId={session.membership.centerId}
        centerName={session.membership.centerName}
        directorName={session.user.fullName}
      />
    );
  }

  const roleTitle =
    role === "teacher"
      ? t("dashboardHome.teacherTitle")
      : t("dashboardHome.parentTitle");

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky via-primary to-mint text-white shadow-pop">
        {/* friendly sky scene */}
        <KidCloud className="pointer-events-none absolute left-6 top-6 h-10 w-20 animate-float text-white/70" />
        <KidCloud className="pointer-events-none absolute right-1/3 top-10 hidden h-8 w-16 animate-float-slow text-white/50 lg:block" />
        <KidBalloon className="pointer-events-none absolute -bottom-3 right-10 hidden h-24 w-14 animate-float text-coral lg:block" />
        <KidBalloon className="pointer-events-none absolute -bottom-6 right-28 hidden h-20 w-12 animate-float-slow text-sunshine lg:block" />
        <div className="relative grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="p-6 sm:p-9">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/25 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
              👋 {roleTitle}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight drop-shadow-sm sm:text-4xl">
              {t("dashboardHome.hello", { name: session.user.fullName })}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90">
              {session.membership.centerName
                ? t("dashboardHome.centerDescription", {
                    center: session.membership.centerName,
                  })
                : t("dashboardHome.activeDescription")}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric label={t("dashboardHome.attendance")} value="92%" Icon={CheckCircle2} accent="text-mint" />
              <Metric label={t("dashboardHome.newMessages")} value="8" Icon={Bell} accent="text-sunshine" />
              <Metric label={t("dashboardHome.todayPlan")} value="4" Icon={CalendarDays} accent="text-coral" />
            </div>
          </div>

          <div className="relative hidden items-center justify-center lg:flex">
            <div className="absolute h-52 w-52 rounded-full bg-white/15 blur-2xl" />
            <KidSun className="absolute left-4 top-4 h-14 w-14 animate-float text-sunshine/70" />
            <div className="relative h-80 w-full">
              <KidsToys3D />
            </div>
          </div>
        </div>
      </section>

      {role === "teacher" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            href="/dashboard/reports"
            title={t("dashboardHome.dailyReport")}
            description={t("dashboardHome.dailyReportTeacherDesc")}
            Icon={CheckCircle2}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/albums"
            title={t("dashboardHome.album")}
            description={t("dashboardHome.albumTeacherDesc")}
            Icon={Images}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/notices"
            title={t("dashboardHome.notices")}
            description={t("dashboardHome.noticesTeacherDesc")}
            Icon={Bell}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/meals"
            title={t("dashboardHome.meals")}
            description={t("dashboardHome.mealsTeacherDesc")}
            Icon={Utensils}
            openLabel={t("dashboardHome.open")}
          />
        </div>
      ) : null}

    </div>
  );
}

function DirectorHome({
  centerId,
  centerName,
  directorName,
}: {
  centerId: string | null;
  centerName: string | null;
  directorName: string;
}) {
  const { t, i18n } = useLayoutTranslation("app");
  const {
    data: summary,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.director.homeSummary(centerId ?? ""),
    queryFn: () => orpc.director.homeSummary({ centerId: centerId! }),
    enabled: !!centerId,
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          {t("dashboardHome.director.noCenter")}
        </AlertDescription>
      </Alert>
    );
  }

  if (isPending) {
    return <LoadingCard label={t("loading")} />;
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertDescription>
            {error ? toApiError(error).message : t("dashboardHome.director.loadFailed")}
          </AlertDescription>
        </Alert>
        <QuickActions t={t} />
      </div>
    );
  }

  const collectionRate = percent(
    summary.money.paidAmount,
    summary.money.expectedAmount,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Console header — a blue-slate slab that echoes the command rail. The
          thesis is the center's tuition pulse, stated as a single large figure
          with a slim segmented meter, the way an operator reads an instrument. */}
      <section className="overflow-hidden rounded-lg bg-[hsl(var(--sidebar-background))] text-background shadow-card">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/55">
              {t("dashboardHome.director.eyebrow")} · {summary.month.label}
            </p>
            <h1 className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {centerName ?? t("dashboardHome.director.centerFallback")}
            </h1>
            <p className="mt-1.5 text-sm text-background/65">
              {t("dashboardHome.hello", { name: directorName })}
            </p>
          </div>

          <div className="w-full lg:w-72">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-background/55">
                {t("dashboardHome.director.collectionRate")}
              </span>
              <span className="nums text-3xl font-bold leading-none">
                {collectionRate}%
              </span>
            </div>
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-background/15">
              <div
                className="bg-mint"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <p className="nums mt-2 text-xs text-background/60">
              {t("dashboardHome.director.money.paymentLine")} ·{" "}
              {summary.money.paidChildren}/{summary.totals.children}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("dashboardHome.director.stats.children")}
          value={summary.totals.children}
          Icon={Users}
          tone="sky"
        />
        <StatCard
          label={t("dashboardHome.director.stats.classes")}
          value={summary.totals.classes}
          Icon={School}
          tone="mint"
        />
        <StatCard
          label={t("dashboardHome.director.stats.teachers")}
          value={summary.totals.teachers}
          Icon={GraduationCap}
          tone="coral"
        />
      </section>

      {/* Money KPIs get their own wider row so the full dotted sums
          (e.g. 250.000.000 soʻm) read clearly without clipping. */}
      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label={t("dashboardHome.director.stats.expected")}
          value={formatMoney(summary.money.expectedAmount, i18n.language)}
          Icon={WalletCards}
          tone="sun"
        />
        <StatCard
          label={t("dashboardHome.director.stats.unpaid")}
          value={formatMoney(summary.money.unpaidAmount, i18n.language)}
          Icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <MoneySnapshot summary={summary} language={i18n.language} t={t} />
      <ActionNeeded summary={summary} t={t} />
      <ClassOverview summary={summary} language={i18n.language} t={t} />
      <QuickActions t={t} />
    </div>
  );
}

function StatCard({
  label,
  value,
  title,
  Icon,
  tone,
}: {
  label: string;
  value: number | string;
  /** Full, unabbreviated value shown on hover when `value` is compacted. */
  title?: string;
  Icon: LucideIcon;
  tone: "sky" | "mint" | "coral" | "grape" | "sun" | "warning";
}) {
  const toneClass = {
    sky: "bg-sky/15 text-sky-ink",
    mint: "bg-mint/20 text-mint-ink",
    coral: "bg-coral/15 text-coral-ink",
    grape: "bg-grape/15 text-grape-ink",
    sun: "bg-sunshine/25 text-sunshine-ink",
    warning: "bg-warning/10 text-warning",
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold leading-5 text-muted-foreground">
            {label}
          </p>
          <span className={cn("grid h-9 w-9 place-items-center rounded-lg", toneClass)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p
          className="nums mt-3 truncate text-2xl font-bold tracking-tight text-foreground"
          title={title}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function MoneySnapshot({
  summary,
  language,
  t,
}: {
  summary: DirectorHomeSummary;
  language: string;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  const paidPercent = percent(summary.money.paidAmount, summary.money.expectedAmount);
  const unpaidPercent = percent(
    summary.money.unpaidAmount,
    summary.money.expectedAmount,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/25">
        <CardTitle className="text-lg">
          {t("dashboardHome.director.money.title")}
        </CardTitle>
        <CardDescription>
          {t("dashboardHome.director.money.description", {
            amount: formatMoney(summary.money.monthlyTuitionAmount, language),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[160px_1fr] lg:items-center lg:gap-8">
          {/* Collection donut — paid vs unpaid share of the expected total. */}
          <div className="mx-auto flex flex-col items-center gap-3 lg:mx-0">
            <Donut
              segments={[
                { value: summary.money.paidAmount, className: "stroke-mint" },
                { value: summary.money.unpaidAmount, className: "stroke-coral" },
              ]}
              centerTop={`${paidPercent}%`}
              centerBottom={t("dashboardHome.director.collectionRate")}
            />
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-mint" />
                {t("dashboardHome.director.money.paid")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-coral" />
                {t("dashboardHome.director.money.unpaid")}
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <MoneyFigure
                label={t("dashboardHome.director.money.expected")}
                value={formatMoney(summary.money.expectedAmount, language)}
              />
              <MoneyFigure
                label={t("dashboardHome.director.money.paid")}
                value={formatMoney(summary.money.paidAmount, language)}
                positive
              />
              <MoneyFigure
                label={t("dashboardHome.director.money.unpaid")}
                value={formatMoney(summary.money.unpaidAmount, language)}
                warning
              />
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">
                  {t("dashboardHome.director.money.paymentLine")}
                </span>
                <span className="nums text-muted-foreground">
                  {summary.money.paidChildren} / {summary.totals.children}
                </span>
              </div>
              <SegmentedBar
                segments={[
                  { value: paidPercent, className: "bg-mint" },
                  { value: unpaidPercent, className: "bg-coral" },
                ]}
              />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-mint" />
                  {t("dashboardHome.director.money.paidChildren", {
                    count: summary.money.paidChildren,
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-coral" />
                  {t("dashboardHome.director.money.unpaidChildren", {
                    count: summary.money.unpaidChildren,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * A compact SVG donut for part-to-whole shares (e.g. paid vs unpaid amount).
 * Segments are drawn clockwise from the top; the center holds a headline
 * figure and a small caption.
 */
function Donut({
  segments,
  centerTop,
  centerBottom,
  size = 132,
  stroke = 13,
}: {
  segments: Array<{ value: number; className: string }>;
  centerTop: string;
  centerBottom: string;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${centerBottom}: ${centerTop}`}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          {total > 0 &&
            segments.map((segment, i) => {
              const length = (segment.value / total) * circumference;
              const dash = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  className={segment.className}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return dash;
            })}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="nums text-2xl font-bold leading-none tracking-tight text-foreground">
            {centerTop}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {centerBottom}
          </p>
        </div>
      </div>
    </div>
  );
}

/** A horizontal stacked meter. Segment values are percentages (0–100). */
function SegmentedBar({
  segments,
  className,
}: {
  segments: Array<{ value: number; className: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-3 overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {segments.map((segment, i) => (
        <div
          key={i}
          className={segment.className}
          style={{ width: `${segment.value}%` }}
        />
      ))}
    </div>
  );
}

function MoneyFigure({
  label,
  value,
  positive,
  warning,
}: {
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={cn(
          "nums mt-2 text-xl font-bold tracking-tight",
          positive ? "text-mint-ink" : null,
          warning ? "text-coral-ink" : null,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ActionNeeded({
  summary,
  t,
}: {
  summary: DirectorHomeSummary;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  const actions = [
    {
      label: t("dashboardHome.director.actions.parentRequests"),
      value: summary.actionsNeeded.pendingParentRequests,
      href: "/dashboard/requests",
      Icon: UserPlus,
    },
    {
      label: t("dashboardHome.director.actions.teacherRequests"),
      value: summary.actionsNeeded.pendingTeacherRequests,
      href: "/dashboard/requests",
      Icon: GraduationCap,
    },
    {
      label: t("dashboardHome.director.actions.classesWithoutTeacher"),
      value: summary.actionsNeeded.classesWithoutTeacher,
      href: "/dashboard/classes",
      Icon: School,
    },
    {
      label: t("dashboardHome.director.actions.unpaidChildren"),
      value: summary.actionsNeeded.unpaidChildren,
      href: "/dashboard/classes",
      Icon: WalletCards,
    },
    {
      label: t("dashboardHome.director.actions.missingDocuments"),
      value: summary.actionsNeeded.missingDocuments,
      href: "/dashboard/documents",
      Icon: FileWarning,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">
          {t("dashboardHome.director.actions.title")}
        </CardTitle>
        <CardDescription>
          {t("dashboardHome.director.actions.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex min-h-24 flex-col justify-between gap-3 rounded-lg border p-3 transition hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <action.Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold leading-5">{action.label}</span>
            </span>
            <Badge
              className="w-fit"
              variant={action.value > 0 ? "warning" : "secondary"}
            >
              {action.value}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function ClassOverview({
  summary,
  language,
  t,
}: {
  summary: DirectorHomeSummary;
  language: string;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  // Center-wide capacity, drawn only from classes that declare a cap.
  const capped = summary.classes.filter((k) => k.maxChildren != null);
  const totalSeats = capped.reduce((sum, k) => sum + (k.maxChildren ?? 0), 0);
  const filledSeats = capped.reduce((sum, k) => sum + k.childCount, 0);
  const centerOccupancy = percent(filledSeats, totalSeats);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg">
              {t("dashboardHome.director.classes.title")}
            </CardTitle>
            <CardDescription>
              {t("dashboardHome.director.classes.description")}
            </CardDescription>
          </div>
          {totalSeats > 0 ? (
            <div className="w-full shrink-0 sm:w-56">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("dashboardHome.director.classes.capacity")}
                </span>
                <span className="nums text-sm font-bold">{centerOccupancy}%</span>
              </div>
              <SegmentedBar
                segments={[{ value: centerOccupancy, className: "bg-sky" }]}
              />
              <p className="nums mt-1.5 text-xs text-muted-foreground">
                {t("dashboardHome.director.classes.ofSeats", {
                  filled: filledSeats,
                  total: totalSeats,
                })}
              </p>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {summary.classes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="font-semibold">
              {t("dashboardHome.director.classes.emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dashboardHome.director.classes.emptyBody")}
            </p>
          </div>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="nums w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="border-b py-2.5 pr-4 font-semibold">
                    {t("dashboardHome.director.classes.class")}
                  </th>
                  <th className="border-b px-4 py-2.5 font-semibold">
                    {t("dashboardHome.director.classes.occupancy")}
                  </th>
                  <th className="border-b px-4 py-2.5 font-semibold">
                    {t("dashboardHome.director.classes.teacher")}
                  </th>
                  <th className="border-b px-4 py-2.5 text-right font-semibold">
                    {t("dashboardHome.director.classes.expected")}
                  </th>
                  <th className="border-b py-2.5 pl-4 font-semibold">
                    {t("dashboardHome.director.classes.collection")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {summary.classes.map((klass) => {
                  const collectionPercent = percent(
                    klass.paidChildren,
                    klass.childCount,
                  );
                  const isFull = klass.emptySeats === 0;
                  const occupancyColor = isFull
                    ? "bg-warning"
                    : (klass.occupancyPercent ?? 0) < 50
                      ? "bg-sky/55"
                      : "bg-sky";

                  return (
                    <tr
                      key={klass.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <td className="py-3 pr-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
                            {klass.name.trim().charAt(0).toUpperCase() || "—"}
                          </span>
                          <span className="font-semibold">{klass.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <SegmentedBar
                            className="h-2 w-20"
                            segments={[
                              {
                                value: klass.occupancyPercent ?? 0,
                                className: occupancyColor,
                              },
                            ]}
                          />
                          {isFull ? (
                            <Badge variant="warning">
                              {t("dashboardHome.director.classes.full")}
                            </Badge>
                          ) : (
                            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                              {klass.maxChildren != null
                                ? `${klass.childCount}/${klass.maxChildren}`
                                : klass.childCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {klass.teacherNames.length > 0 ? (
                          <span className="text-muted-foreground">
                            {klass.teacherNames.join(", ")}
                          </span>
                        ) : (
                          <Badge variant="warning">
                            {t("dashboardHome.director.classes.noTeacher")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-middle font-semibold">
                        {formatMoney(klass.expectedAmount, language)}
                      </td>
                      <td className="py-3 pl-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <SegmentedBar
                            className="h-2 w-24"
                            segments={[
                              { value: collectionPercent, className: "bg-mint" },
                              {
                                value:
                                  klass.childCount > 0
                                    ? 100 - collectionPercent
                                    : 0,
                                className: "bg-coral",
                              },
                            ]}
                          />
                          <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                            {klass.paidChildren}/{klass.childCount}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions({
  t,
}: {
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  const actions = [
    {
      href: "/dashboard/requests",
      label: t("dashboardHome.director.quick.approveRequests"),
      Icon: Inbox,
    },
    {
      href: "/dashboard/classes",
      label: t("dashboardHome.director.quick.addClass"),
      Icon: School,
    },
    {
      href: "/dashboard/invitations",
      label: t("dashboardHome.director.quick.inviteTeacher"),
      Icon: GraduationCap,
    },
    {
      href: "/dashboard/invitations",
      label: t("dashboardHome.director.quick.inviteParent"),
      Icon: UserPlus,
    },
    {
      href: "/dashboard/notices/new",
      label: t("dashboardHome.director.quick.sendNotice"),
      Icon: Megaphone,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">
          {t("dashboardHome.director.quick.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Button key={action.label} asChild variant="outline" className="justify-start">
            <Link href={action.href}>
              <action.Icon className="h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        ))}
        <Button disabled variant="secondary" className="justify-start">
          <WalletCards className="h-4 w-4" />
          {t("dashboardHome.director.quick.paymentsSoon")}
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/15 p-4 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/25">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-white/85">{label}</p>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/90">
          <Icon className={cn("h-4 w-4", accent)} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

const cardAccents: Record<string, string> = {
  "/dashboard/requests": "bg-coral/15 text-coral group-hover:bg-coral group-hover:text-white",
  "/dashboard/invitations": "bg-sky/15 text-sky group-hover:bg-sky group-hover:text-white",
  "/dashboard/albums": "bg-grape/15 text-grape group-hover:bg-grape group-hover:text-white",
  "/dashboard/meals": "bg-mint/15 text-mint group-hover:bg-mint group-hover:text-white",
  "/dashboard/reports": "bg-coral/15 text-coral group-hover:bg-coral group-hover:text-white",
  "/dashboard/notices": "bg-sky/15 text-sky group-hover:bg-sky group-hover:text-white",
  "/dashboard/pickups": "bg-grape/15 text-grape group-hover:bg-grape group-hover:text-white",
};

function ActionCard({
  href,
  title,
  description,
  Icon,
  openLabel,
}: {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  openLabel: string;
}) {
  const accent =
    cardAccents[href] ??
    "bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-white";
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-3xl border-2 border-transparent bg-card text-card-foreground shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-pop"
    >
      <CardContent className="flex min-h-44 flex-col gap-2 p-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-12 w-12 place-items-center rounded-2xl transition-colors duration-300 group-hover:rotate-3",
              accent,
            )}
          >
            <Icon className="h-6 w-6" />
          </span>
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {openLabel} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </CardContent>
    </Link>
  );
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

/**
 * Tuition sums in UZS, grouped with dots so large numbers stay readable at a
 * glance — e.g. 250000000 → "250.000.000 soʻm". The dot grouping is applied
 * directly (not locale-dependent) since directors asked for this exact style.
 */
function formatMoney(amount: number, _language: string) {
  const rounded = Math.round(amount);
  const grouped = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${rounded < 0 ? "-" : ""}${grouped} soʻm`;
}
