"use client";

import Link from "next/link";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { useSession } from "@/lib/session";

export function DashboardHome() {
  const { t } = useLayoutTranslation("app");
  const { session } = useSession();
  if (!session) return null;

  const role = session.user.role;
  const roleTitle =
    role === "director"
      ? t("dashboardHome.directorTitle")
      : role === "teacher"
        ? t("dashboardHome.teacherTitle")
        : t("dashboardHome.parentTitle");

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border bg-white shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-extrabold uppercase text-primary">
              {roleTitle}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {t("dashboardHome.hello", { name: session.user.fullName })}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {session.membership.centerName
                ? t("dashboardHome.centerDescription", {
                    center: session.membership.centerName,
                  })
                : t("dashboardHome.activeDescription")}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric label={t("dashboardHome.attendance")} value="92%" Icon={CheckCircle2} />
              <Metric label={t("dashboardHome.newMessages")} value="8" Icon={Bell} />
              <Metric label={t("dashboardHome.todayPlan")} value="4" Icon={CalendarDays} />
            </div>
          </div>

          <div className="relative hidden min-h-72 overflow-hidden bg-accent lg:block">
            <img
              src="/images/uzbek-kindergarten-roles.png"
              alt=""
              className="h-full w-full object-cover object-center"
            />
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

      {role === "parent" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            href="/dashboard/reports"
            title={t("dashboardHome.dailyReport")}
            description={t("dashboardHome.dailyReportParentDesc")}
            Icon={CheckCircle2}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/albums"
            title={t("dashboardHome.album")}
            description={t("dashboardHome.albumParentDesc")}
            Icon={Images}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/notices"
            title={t("dashboardHome.notices")}
            description={t("dashboardHome.noticesParentDesc")}
            Icon={Bell}
            openLabel={t("dashboardHome.open")}
          />
          <ActionCard
            href="/dashboard/pickups"
            title={t("dashboardHome.pickup")}
            description={t("dashboardHome.pickupDesc")}
            Icon={CalendarDays}
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
}: {
  label: string;
  value: string;
  Icon: typeof CheckCircle2;
}) {
  return (
    <div className="rounded-xl border bg-[#fbfdff] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

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
  return (
    <Link
      href={href}
      className="group block rounded-2xl border bg-white text-card-foreground shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-pop"
    >
      <CardContent className="flex min-h-44 flex-col gap-2 p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-bold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {openLabel} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </CardContent>
    </Link>
  );
}
