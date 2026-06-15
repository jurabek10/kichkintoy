"use client";

import Link from "next/link";
import { useState } from "react";
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
  Soup,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { KidCloud } from "@/components/kids-decor";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Parent home — a calm, mobile-first feed of "what happened with my child today",
 * inspired by KidsNote's timeline. This is the parent's main screen.
 *
 * NOTE: the children + feed items below are DESIGN PLACEHOLDERS so the layout can
 * be reviewed. They are meant to be replaced by the real feed query later — the
 * presentational pieces (FeedCard, QuickAction, ChildChip) are already data-shaped.
 */

const SAMPLE_CHILDREN = [
  { id: "1", name: "Amir", className: "Quyoshlar", color: "bg-sky" },
  { id: "2", name: "Laylo", className: "Kapalaklar", color: "bg-bubblegum" },
];

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export function ParentHome() {
  const { t, i18n } = useLayoutTranslation("app");
  const { session } = useSession();
  const [activeChildId, setActiveChildId] = useState(SAMPLE_CHILDREN[0]!.id);
  if (!session) return null;

  const activeChild =
    SAMPLE_CHILDREN.find((c) => c.id === activeChildId) ?? SAMPLE_CHILDREN[0]!;

  const todayLabel = new Date().toLocaleDateString(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto flex w-full max-w-[1060px] flex-col gap-6 xl:flex-row xl:items-start xl:justify-center">
      {/* Feed column — kept narrow for comfortable reading */}
      <div className="flex w-full max-w-[680px] flex-col gap-4">
      {/* Greeting + child context */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-sky p-5 text-white shadow-card sm:p-6">
        <KidCloud className="pointer-events-none absolute -right-3 -top-2 h-12 w-24 text-white/20" />
        <div className="relative flex items-center gap-4">
          <span
            className={cn(
              "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-bold text-white shadow-sm ring-4 ring-white/30",
              activeChild.color,
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
              {t("parentHome.childClass", { name: activeChild.className })}
            </p>
          </div>
        </div>

        {/* Child switcher — only when the parent has more than one child */}
        {SAMPLE_CHILDREN.length > 1 ? (
          <div className="relative mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SAMPLE_CHILDREN.map((child) => {
              const active = child.id === activeChildId;
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
                      child.color,
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

      {/* Quick actions — large, thumb-friendly tiles */}
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
            {todayLabel}
          </span>
        </div>

        {/* Daily report */}
        <FeedCard
          href="/dashboard/reports"
          tag={t("parentHome.report.tag")}
          tagClass="bg-coral/15 text-coral-ink"
          Icon={FileText}
          time="16:30"
          title={t("parentHome.report.title")}
          body={t("parentHome.report.body")}
          cta={t("parentHome.report.cta")}
        >
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat Icon={Smile} label={t("parentHome.report.mood")} value={t("parentHome.report.moodValue")} />
            <Stat Icon={Soup} label={t("parentHome.report.meal")} value={t("parentHome.report.mealValue")} />
            <Stat Icon={CalendarCheck} label={t("parentHome.report.nap")} value={t("parentHome.report.napValue")} />
          </div>
        </FeedCard>

        {/* Photo album */}
        <FeedCard
          href="/dashboard/albums"
          tag={t("parentHome.photos.tag")}
          tagClass="bg-grape/15 text-grape-ink"
          Icon={Images}
          time="14:10"
          title={t("parentHome.photos.title")}
          body={t("parentHome.photos.caption", { count: 6 })}
          cta={t("parentHome.photos.cta")}
        >
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              "from-sky/40 to-mint/40",
              "from-coral/40 to-sunshine/40",
              "from-grape/40 to-bubblegum/40",
            ].map((g, i) => (
              <div
                key={i}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br",
                  g,
                )}
              >
                {i === 2 ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/35 text-sm font-bold text-white">
                    +4
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </FeedCard>

        {/* Notice */}
        <FeedCard
          href="/dashboard/notices"
          tag={t("parentHome.notice.tag")}
          tagClass="bg-sky/15 text-sky-ink"
          Icon={Bell}
          time="09:00"
          title={t("parentHome.notice.title")}
          body={t("parentHome.notice.body")}
          cta={t("parentHome.notice.cta")}
        />

        {/* Meal */}
        <FeedCard
          href="/dashboard/meals"
          tag={t("parentHome.meal.tag")}
          tagClass="bg-sunshine/20 text-sunshine-ink"
          Icon={UtensilsCrossed}
          time="12:00"
          title={t("parentHome.meal.title")}
          body={t("parentHome.meal.body")}
        />
      </section>
      </div>

      {/* Side panel — fills desktop space with useful context (xl and up only) */}
      <aside className="hidden w-[320px] shrink-0 flex-col gap-4 xl:flex">
        <div className="sticky top-20 flex flex-col gap-4">
          {/* Child profile */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-black text-white",
                  activeChild.color,
                )}
              >
                {initials(activeChild.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight">
                  {activeChild.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {t("parentHome.childClass", { name: activeChild.className })}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-muted/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky/15 text-sky-ink">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("parentHome.aside.teacher")}
                </p>
                <p className="truncate text-sm font-bold">
                  {t("parentHome.aside.teacherName")}
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

          {/* Monthly attendance glance */}
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
                  {t("parentHome.aside.attendanceValue")}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[90%] rounded-full bg-mint" />
            </div>
          </div>

          {/* Upcoming events */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {t("parentHome.aside.upcoming")}
              </h3>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              <UpcomingItem
                color="bg-coral"
                title={t("parentHome.aside.trip")}
                when={t("parentHome.aside.tripWhen")}
              />
              <UpcomingItem
                color="bg-sky"
                title={t("parentHome.aside.meeting")}
                when={t("parentHome.aside.meetingWhen")}
              />
            </ul>
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
        <span className="text-xs font-semibold text-muted-foreground">
          {time}
        </span>
      </div>

      <h3 className="mt-2.5 text-base font-semibold leading-snug text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>

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
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
