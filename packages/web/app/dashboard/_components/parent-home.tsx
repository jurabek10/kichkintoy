"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarDays,
  FileText,
  Images,
  MessageCircle,
  Pill,
  Smile,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { KidCloud } from "@/components/kids-decor";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { formatDayMonth, formatTime, formatWeekdayLong } from "@/lib/date";

/**
 * Parent home — a calm, mobile-first feed of "what happened with my child
 * today", driven by real data (children, daily reports, albums, notices,
 * attendance, upcoming events). Dates render in the active language via the
 * locale-aware helpers in lib/date.
 */

// A small candy palette so each child gets a stable, distinct avatar colour.
const CHILD_COLORS = ["bg-sky", "bg-bubblegum", "bg-grape", "bg-mint", "bg-coral"];

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

// Statuses that count as the child having attended that day.
const ATTENDED = new Set(["present", "late", "left_early", "picked_up"]);

function monthRange() {
  const now = new Date();
  // Local date string — toISOString() would shift to UTC and roll back a day
  // in positive-offset zones (e.g. Uzbekistan, UTC+5).
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: iso(first), to: iso(now) };
}

export function ParentHome() {
  const { t, i18n } = useLayoutTranslation("app");
  const { session } = useSession();
  const lang = i18n.language;
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(),
    queryFn: () => orpc.attendance.children(),
  });
  const children = childrenQuery.data?.children ?? [];

  // Default to the first child once loaded.
  useEffect(() => {
    if (!activeChildId && children.length > 0) {
      setActiveChildId(children[0]!.id);
    }
  }, [activeChildId, children]);

  const activeChild =
    children.find((c) => c.id === activeChildId) ?? children[0] ?? null;
  const childId = activeChild?.id ?? "";
  const colorFor = (id: string) =>
    CHILD_COLORS[children.findIndex((c) => c.id === id) % CHILD_COLORS.length]!;

  const { from, to } = useMemo(monthRange, []);
  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance.parentList({ childId, from, to }),
    queryFn: () => orpc.attendance.parentList({ childId, from, to }),
    enabled: !!childId,
  });
  const reportsQuery = useQuery({
    queryKey: queryKeys.parent.childReports(childId),
    queryFn: () => orpc.reports.parentList({ childId }),
    enabled: !!childId,
  });
  const albumsQuery = useQuery({
    queryKey: queryKeys.albums.parentList(childId),
    queryFn: () => orpc.albums.parentList({ childId }),
    enabled: !!childId,
  });
  const noticesQuery = useQuery({
    queryKey: queryKeys.notices.parentList(),
    queryFn: () => orpc.notices.parentList({}),
  });
  const upcomingQuery = useQuery({
    queryKey: queryKeys.calendar.upcoming({ childId, limit: 4 }),
    queryFn: () => orpc.calendar.upcoming({ childId, limit: 4 }),
    enabled: !!childId,
  });

  if (!session) return null;

  // ---- derive view models from the real data ------------------------------
  const records = attendanceQuery.data ?? [];
  const attendedDays = records.filter((r) => ATTENDED.has(r.status)).length;
  const recordedDays = records.length;
  const attendancePct = recordedDays
    ? Math.round((attendedDays / recordedDays) * 100)
    : 0;

  // Pick the newest item explicitly rather than trusting list order.
  const latestReport = (reportsQuery.data ?? [])
    .filter((r) => r.status === "published")
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  const latestAlbum = [...(albumsQuery.data ?? [])].sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  )[0];
  const latestNotice = [...(noticesQuery.data ?? [])].sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  )[0];
  const upcoming = upcomingQuery.data ?? [];
  // The teacher who authors the child's daily reports — the closest real
  // "your child's teacher" signal available to parents.
  const teacherName = latestReport?.author.fullName;

  const feedLoading =
    reportsQuery.isPending || albumsQuery.isPending || noticesQuery.isPending;
  const hasFeed = !!(latestReport || latestAlbum || latestNotice);

  if (childrenQuery.isPending) {
    return <KidsLoader size="lg" className="min-h-[40vh]" />;
  }
  if (!activeChild) {
    return (
      <div className="mx-auto grid min-h-[40vh] max-w-md place-items-center gap-2 text-center">
        <Smile className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-bold">{t("parentHome.noChildrenTitle")}</p>
        <p className="text-sm text-muted-foreground">
          {t("parentHome.noChildrenBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1060px] flex-col gap-6 xl:flex-row xl:items-start xl:justify-center">
      <div className="flex w-full max-w-[680px] flex-col gap-4">
        {/* Greeting + child context */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-sky p-5 text-white shadow-card sm:p-6">
          <KidCloud className="pointer-events-none absolute -right-3 -top-2 h-12 w-24 text-white/20" />
          <div className="relative flex items-center gap-4">
            <span
              className={cn(
                "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-bold text-white shadow-sm ring-4 ring-white/30",
                colorFor(activeChild.id),
              )}
            >
              {initials(activeChild.name)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                {t("parentHome.todaySub")}
              </p>
              <h1 className="truncate text-2xl font-bold leading-tight sm:text-3xl">
                {activeChild.name}
              </h1>
              <p className="truncate text-sm text-white/85">
                {activeChild.className
                  ? t("parentHome.childClass", { name: activeChild.className })
                  : activeChild.centerName}
              </p>
            </div>
          </div>

          {children.length > 1 ? (
            <div className="relative mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {children.map((child) => {
                const active = child.id === activeChild.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setActiveChildId(child.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition",
                      active
                        ? "bg-white text-primary shadow-sm"
                        : "bg-white/15 text-white hover:bg-white/25",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold text-white",
                        colorFor(child.id),
                      )}
                    >
                      {initials(child.name)}
                    </span>
                    {child.name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Quick actions */}
        <section>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            <QuickAction href="/dashboard/reports" label={t("parentHome.quick.report")} Icon={FileText} className="bg-coral/15 text-coral-ink" />
            <QuickAction href="/dashboard/albums" label={t("parentHome.quick.photos")} Icon={Images} className="bg-grape/15 text-grape-ink" />
            <QuickAction href="/dashboard/notices" label={t("parentHome.quick.notices")} Icon={Bell} className="bg-sky/15 text-sky-ink" />
            <QuickAction href="/dashboard/pickups" label={t("parentHome.quick.pickup")} Icon={CalendarCheck} className="bg-mint/15 text-mint-ink" />
            <QuickAction href="/dashboard/meals" label={t("parentHome.quick.meals")} Icon={UtensilsCrossed} className="bg-sunshine/20 text-sunshine-ink" />
            <QuickAction href="/dashboard/medications" label={t("parentHome.quick.medication")} Icon={Pill} className="bg-bubblegum/15 text-bubblegum-ink" />
          </div>
        </section>

        {/* Today timeline */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-lg font-bold tracking-tight">
              {t("parentHome.today")}
            </h2>
            <span className="shrink-0 text-xs font-semibold capitalize text-muted-foreground">
              {formatWeekdayLong(new Date(), lang)}
            </span>
          </div>

          {feedLoading ? (
            <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
              <KidsLoader size="sm" />
            </div>
          ) : !hasFeed ? (
            <div className="grid place-items-center gap-2 rounded-3xl border border-border bg-card p-8 text-center shadow-card">
              <Smile className="h-8 w-8 text-muted-foreground" />
              <p className="font-bold">{t("parentHome.caughtUpTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("parentHome.caughtUp")}
              </p>
            </div>
          ) : (
            <>
              {latestReport ? (
                <FeedCard
                  href="/dashboard/reports"
                  tag={t("parentHome.report.tag")}
                  tagClass="bg-coral/15 text-coral-ink"
                  Icon={FileText}
                  time={formatDayMonth(latestReport.reportDate, lang)}
                  title={t("parentHome.report.title")}
                  body={
                    latestReport.teacherNote?.trim() ||
                    t("parentHome.report.empty")
                  }
                  cta={t("parentHome.report.cta")}
                >
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Stat
                      Icon={Smile}
                      label={t("parentHome.report.mood")}
                      value={latestReport.mood?.trim() || "—"}
                    />
                    <Stat
                      Icon={Images}
                      label={t("parentHome.report.photos")}
                      value={String(latestReport.photoCount)}
                    />
                    <Stat
                      Icon={FileText}
                      label={t("parentHome.report.updates")}
                      value={String(latestReport.itemCount)}
                    />
                  </div>
                </FeedCard>
              ) : null}

              {latestAlbum ? (
                <FeedCard
                  href="/dashboard/albums"
                  tag={t("parentHome.photos.tag")}
                  tagClass="bg-grape/15 text-grape-ink"
                  Icon={Images}
                  time={
                    latestAlbum.publishedAt
                      ? formatDayMonth(latestAlbum.publishedAt, lang)
                      : ""
                  }
                  title={latestAlbum.caption?.trim() || t("parentHome.photos.tag")}
                  body={t("parentHome.photos.caption", {
                    count: latestAlbum.mediaCount,
                  })}
                  cta={t("parentHome.photos.cta")}
                />
              ) : null}

              {latestNotice ? (
                <FeedCard
                  href="/dashboard/notices"
                  tag={t("parentHome.notice.tag")}
                  tagClass="bg-sky/15 text-sky-ink"
                  Icon={Bell}
                  time={
                    latestNotice.publishedAt
                      ? formatDayMonth(latestNotice.publishedAt, lang)
                      : ""
                  }
                  title={latestNotice.title}
                  body={latestNotice.bodyPreview}
                  cta={t("parentHome.notice.cta")}
                />
              ) : null}
            </>
          )}
        </section>
      </div>

      {/* Side panel */}
      <aside className="hidden w-[320px] shrink-0 flex-col gap-4 xl:flex">
        <div className="sticky top-20 flex flex-col gap-4">
          {/* Child profile */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-bold text-white",
                  colorFor(activeChild.id),
                )}
              >
                {initials(activeChild.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight">
                  {activeChild.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {activeChild.className
                    ? t("parentHome.childClass", { name: activeChild.className })
                    : activeChild.centerName}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-muted/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky/15 text-sky-ink">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">
                  {teacherName
                    ? t("parentHome.aside.teacher")
                    : t("parentHome.aside.center")}
                </p>
                <p className="truncate text-sm font-bold">
                  {teacherName ?? activeChild.centerName}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/notices"
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" />
              {t("parentHome.aside.messageTeacher")}
            </Link>
          </div>

          {/* Monthly attendance — real present/recorded with a clear label */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint/15 text-mint-ink">
                <CalendarCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("parentHome.aside.attendanceTitle")}
                </p>
                <p className="text-base font-bold">
                  {attendanceQuery.isPending
                    ? "—"
                    : t("parentHome.aside.attendanceValue", {
                        attended: attendedDays,
                        total: recordedDays,
                      })}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-mint transition-all"
                style={{ width: `${attendancePct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("parentHome.aside.attendanceCaption")}
            </p>
          </div>

          {/* Upcoming events — real calendar data */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {t("parentHome.aside.upcoming")}
              </h3>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            {upcomingQuery.isPending ? (
              <KidsLoader size="sm" className="py-4" />
            ) : upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("parentHome.aside.noUpcoming")}
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {upcoming.map((event, i) => (
                  <UpcomingItem
                    key={event.id}
                    color={CHILD_COLORS[i % CHILD_COLORS.length]!}
                    title={event.title}
                    when={
                      event.allDay
                        ? formatDayMonth(event.startsAt, lang)
                        : `${formatDayMonth(event.startsAt, lang)} · ${formatTime(event.startsAt)}`
                    }
                  />
                ))}
              </ul>
            )}
            <Link
              href="/dashboard/calendar"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary"
            >
              {t("parentHome.aside.viewCalendar")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

function UpcomingItem({
  color,
  title,
  when,
}: {
  color: string;
  title: string;
  when: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color)} />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{when}</p>
      </div>
    </li>
  );
}

function QuickAction({
  href,
  label,
  Icon,
  className,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  className: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-2xl transition-transform group-hover:scale-105",
          className,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-semibold leading-tight text-foreground">
        {label}
      </span>
    </Link>
  );
}

function FeedCard({
  href,
  tag,
  tagClass,
  Icon,
  time,
  title,
  body,
  cta,
  children,
}: {
  href: string;
  tag: string;
  tagClass: string;
  Icon: LucideIcon;
  time: string;
  title: string;
  body: string;
  cta?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-3xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-pop sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
            tagClass,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {tag}
        </span>
        {time ? (
          <span className="text-xs font-semibold text-muted-foreground">
            {time}
          </span>
        ) : null}
      </div>

      <h3 className="mt-2.5 text-base font-semibold leading-snug text-foreground">
        {title}
      </h3>
      <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {body}
      </p>

      {children}

      {cta ? (
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </Link>
  );
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/60 p-2.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
