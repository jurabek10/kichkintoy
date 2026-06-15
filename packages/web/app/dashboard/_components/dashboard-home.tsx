"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Images,
  Inbox,
  Mail,
  Utensils,
} from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { KidSun, KidCloud, KidBalloon } from "@/components/kids-decor";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
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
  const roleTitle =
    role === "director"
      ? t("dashboardHome.directorTitle")
      : role === "teacher"
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

      {role === "director" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            href="/dashboard/requests"
            title={t("dashboardHome.joinRequests")}
            description={t("dashboardHome.joinRequestsDesc")}
            Icon={Inbox}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/invitations"
            title={t("dashboardHome.invitations")}
            description={t("dashboardHome.invitationsDesc")}
            Icon={Mail}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/albums"
            title={t("dashboardHome.album")}
            description={t("dashboardHome.albumDirectorDesc")}
            Icon={Images}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/meals"
            title={t("dashboardHome.meals")}
            description={t("dashboardHome.mealsDirectorDesc")}
            Icon={Utensils}
            openLabel={t("dashboardHome.open")}
          />
        </div>
      ) : null}

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

function Metric({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: string;
  Icon: typeof CheckCircle2;
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
  Icon: typeof Inbox;
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
