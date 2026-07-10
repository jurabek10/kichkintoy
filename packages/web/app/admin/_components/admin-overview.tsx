"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Building2,
  GraduationCap,
  Heart,
  School,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminOverviewStats } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDateNumeric } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { centerStatusVariant } from "./center-status";

export function AdminOverview() {
  const { t } = useLayoutTranslation("admin");
  const { t: tCommon } = useLayoutTranslation("common");
  const { session } = useSession();

  const {
    data: stats,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: () => orpc.admin.overview.stats({}),
  });

  if (isPending) {
    return <LoadingCard label={t("loading")} />;
  }

  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : t("overview.loadFailed")}
        </AlertDescription>
      </Alert>
    );
  }

  const activePercent = percent(
    stats.centersByStatus.active,
    stats.totals.centers,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Console header — the same blue-slate slab the director sees, but the
          instrument reads the whole platform: total centers with an
          active/suspended meter instead of one center's tuition pulse. */}
      <section className="overflow-hidden rounded-lg bg-[hsl(var(--sidebar-background))] text-background shadow-card">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/55">
              {t("shell.panel")}
            </p>
            <h1 className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {t("overview.title")}
            </h1>
            <p className="mt-1.5 text-sm text-background/65">
              {tCommon("dashboard.hello", {
                name: session?.user.fullName ?? "",
              })}{" "}
              · {t("overview.description")}
            </p>
          </div>

          <div className="w-full lg:w-72">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-background/55">
                {t("overview.stats.centers")}
              </span>
              <span className="nums text-3xl font-bold leading-none">
                {stats.totals.centers}
              </span>
            </div>
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-background/15">
              <div className="bg-mint" style={{ width: `${activePercent}%` }} />
            </div>
            <p className="nums mt-2 text-xs text-background/60">
              {t("overview.byStatus.active")}: {stats.centersByStatus.active} ·{" "}
              {t("overview.byStatus.suspended")}:{" "}
              {stats.centersByStatus.suspended}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={t("overview.stats.centers")}
          value={stats.totals.centers}
          Icon={Building2}
          tone="sky"
        />
        <StatCard
          label={t("overview.stats.children")}
          value={stats.totals.children}
          Icon={Users}
          tone="mint"
        />
        <StatCard
          label={t("overview.stats.teachers")}
          value={stats.totals.teachers}
          Icon={GraduationCap}
          tone="coral"
        />
        <StatCard
          label={t("overview.stats.classes")}
          value={stats.totals.classes}
          Icon={School}
          tone="grape"
        />
        <StatCard
          label={t("overview.stats.parents")}
          value={stats.totals.parents}
          Icon={Heart}
          tone="sun"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <RegionsCard stats={stats} t={t} />
        <NewestCentersCard stats={stats} t={t} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number | string;
  Icon: LucideIcon;
  tone: "sky" | "mint" | "coral" | "grape" | "sun";
}) {
  const toneClass = {
    sky: "bg-sky/15 text-sky-ink",
    mint: "bg-mint/20 text-mint-ink",
    coral: "bg-coral/15 text-coral-ink",
    grape: "bg-grape/15 text-grape-ink",
    sun: "bg-sunshine/25 text-sunshine-ink",
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold leading-5 text-muted-foreground">
            {label}
          </p>
          <span
            className={cn("grid h-9 w-9 place-items-center rounded-lg", toneClass)}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="nums mt-3 truncate text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function RegionsCard({
  stats,
  t,
}: {
  stats: AdminOverviewStats;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  const max = Math.max(1, ...stats.centersByRegion.map((row) => row.count));

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("overview.byRegion.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.centersByRegion.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("overview.byRegion.empty")}
          </p>
        ) : (
          <table className="nums w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <th className="border-b py-2.5 pr-4 font-semibold">
                  {t("overview.byRegion.region")}
                </th>
                <th className="w-32 border-b px-4 py-2.5 font-semibold" />
                <th className="w-16 border-b py-2.5 pl-4 text-right font-semibold">
                  {t("overview.byRegion.count")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {stats.centersByRegion.map((row) => (
                <tr key={row.region ?? "none"}>
                  <td className="py-2.5 pr-4 font-semibold">
                    {row.region ?? t("overview.byRegion.noRegion")}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="bg-sky"
                        style={{ width: `${(row.count / max) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 pl-4 text-right font-bold">
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function NewestCentersCard({
  stats,
  t,
}: {
  stats: AdminOverviewStats;
  t: ReturnType<typeof useLayoutTranslation>["t"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
        <CardTitle className="text-lg">{t("overview.newest.title")}</CardTitle>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/admin/centers">
            {t("overview.newest.viewAll")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {stats.newestCenters.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("overview.newest.empty")}
          </p>
        ) : (
          stats.newestCenters.map((center) => (
            <Link
              key={center.id}
              href={`/admin/centers/${center.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 transition hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
                  {center.name.trim().charAt(0).toUpperCase() || "—"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{center.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{center.centerCode}</span>
                    {center.region ? ` · ${center.region}` : ""}
                    {center.directorName
                      ? ` · ${center.directorName}`
                      : ` · ${t("centers.noDirector")}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={centerStatusVariant[center.status]}>
                  {t(`status.${center.status}`)}
                </Badge>
                <span className="nums text-xs text-muted-foreground">
                  {formatDateNumeric(center.createdAt)}
                </span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}
