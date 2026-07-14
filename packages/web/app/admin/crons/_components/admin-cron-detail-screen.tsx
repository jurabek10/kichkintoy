"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  CircleAlert,
  Gauge,
  Timer,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDateNumeric } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { CronRunsTable } from "./cron-runs-table";
import {
  CronStatusBadge,
  durationMs,
  formatDuration,
  statusRail,
} from "./cron-ui";
import { RunNowDialog } from "./run-now-dialog";

export function AdminCronDetailScreen({ jobName }: { jobName: string }) {
  const { t, i18n } = useLayoutTranslation("admin");
  const [page, setPage] = useState(1);
  const listQuery = useQuery({
    queryKey: queryKeys.admin.crons.list(),
    queryFn: () => orpc.admin.crons.list({}),
  });
  const job = listQuery.data?.find((item) => item.name === jobName);
  const runsQuery = useQuery({
    queryKey: queryKeys.admin.crons.runs({ jobName, page }),
    queryFn: () => orpc.admin.crons.runs({ jobName, page }),
  });
  const statsQuery = useQuery({
    queryKey: queryKeys.admin.crons.stats(jobName),
    queryFn: () => orpc.admin.crons.stats({ jobName }),
  });
  const error = listQuery.error ?? runsQuery.error ?? statsQuery.error;

  if (listQuery.isPending) {
    return (
      <Card>
        <CardContent className="p-6">
          <KidsLoader label={t("loading")} size="sm" />
        </CardContent>
      </Card>
    );
  }
  if (!job) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("crons.detail.notFound")}</AlertDescription>
      </Alert>
    );
  }

  const run = job.latestRun;
  const runStatus = run?.status ?? "never";
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 gap-2">
          <Link href="/admin/crons">
            <ArrowLeft className="h-4 w-4" />
            {t("crons.detail.back")}
          </Link>
        </Button>
        <Card className="relative overflow-hidden">
          <span className={statusRail(runStatus)} />
          <CardHeader className="pl-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">
                    {t(`crons.jobNames.${job.name}`)}
                  </CardTitle>
                  <CronStatusBadge status={runStatus} t={t} />
                </div>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {job.name}
                </p>
                <CardDescription className="mt-2 max-w-3xl">
                  {t(job.descriptionKey)}
                </CardDescription>
                <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  {t(`crons.schedules.${job.name}`)}
                  <span className="font-mono text-muted-foreground">
                    {job.cronExpression}
                  </span>
                </p>
              </div>
              <RunNowDialog jobName={job.name} />
            </div>
          </CardHeader>
          {run ? (
            <CardContent className="grid gap-2 pl-7 text-sm text-muted-foreground sm:grid-cols-3">
              <p>
                {t("crons.detail.lastDate", {
                  value: formatDateNumeric(run.runDate),
                })}
              </p>
              <p>
                {t("crons.detail.lastDuration", {
                  value: formatDuration(durationMs(run), i18n.language),
                })}
              </p>
              <p>{t("crons.detail.lastSent", { count: run.sentCount })}</p>
            </CardContent>
          ) : null}
        </Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {statsQuery.isPending || !statsQuery.data ? (
        <Card>
          <CardContent className="p-6">
            <KidsLoader label={t("loading")} size="sm" />
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={Gauge}
            label={t("crons.stats.successRate")}
            value={`${new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(statsQuery.data.successRate)}%`}
            tone="sky"
          />
          <StatCard
            icon={BellRing}
            label={t("crons.stats.sentTotal")}
            value={String(statsQuery.data.sentTotal)}
            tone="mint"
          />
          <StatCard
            icon={statsQuery.data.failureCount ? CircleAlert : CheckCircle2}
            label={t("crons.stats.failures")}
            value={String(statsQuery.data.failureCount)}
            tone={statsQuery.data.failureCount ? "coral" : "mint"}
          />
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("crons.detail.history")}</CardTitle>
          <CardDescription>
            {t("crons.detail.historyDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runsQuery.isPending || !runsQuery.data ? (
            <KidsLoader label={t("loading")} size="sm" />
          ) : (
            <CronRunsTable
              data={runsQuery.data}
              onPageChange={setPage}
              detail
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  tone: "sky" | "mint" | "coral";
}) {
  const toneClass =
    tone === "sky"
      ? "bg-sky text-sky-ink"
      : tone === "mint"
        ? "bg-mint text-mint-ink"
        : "bg-coral text-coral-ink";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClass}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="nums mt-1 text-2xl font-extrabold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
