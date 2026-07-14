"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Clock3, Send, Timer } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDateNumeric, formatDateTime } from "@/lib/format";
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

const statuses = ["running", "succeeded", "failed"] as const;

export function AdminCronsScreen() {
  const { t, i18n } = useLayoutTranslation("admin");
  const [jobName, setJobName] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const params = {
    ...(jobName !== "all" ? { jobName } : {}),
    ...(status !== "all"
      ? { status: status as (typeof statuses)[number] }
      : {}),
    page,
  };
  const jobsQuery = useQuery({
    queryKey: queryKeys.admin.crons.list(),
    queryFn: () => orpc.admin.crons.list({}),
  });
  const runsQuery = useQuery({
    queryKey: queryKeys.admin.crons.runs(params),
    queryFn: () => orpc.admin.crons.runs(params),
  });
  const error = jobsQuery.error ?? runsQuery.error;

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-sky-ink via-primary to-mint-ink" />
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky text-sky-ink">
              <Timer className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-xl">{t("crons.title")}</CardTitle>
              <CardDescription className="mt-1">
                {t("crons.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {jobsQuery.isPending ? (
        <Card>
          <CardContent className="p-6">
            <KidsLoader label={t("loading")} size="sm" />
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {(jobsQuery.data ?? []).map((job) => {
            const run = job.latestRun;
            const runStatus = run?.status ?? "never";
            return (
              <Card key={job.name} className="relative overflow-hidden">
                <span className={statusRail(runStatus)} />
                <CardContent className="grid gap-4 p-4 pl-5 sm:p-5 sm:pl-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/crons/${encodeURIComponent(job.name)}`}
                        className="group inline-flex max-w-full items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary"
                      >
                        <span className="truncate">
                          {t(`crons.jobNames.${job.name}`)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {job.name}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {t(job.descriptionKey)}
                      </p>
                    </div>
                    <CronStatusBadge status={runStatus} t={t} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/25 p-3 text-xs sm:grid-cols-4">
                    <Metric
                      icon={Clock3}
                      label={t("crons.card.schedule")}
                      value={t(`crons.schedules.${job.name}`)}
                    />
                    <Metric
                      label={t("crons.card.lastRun")}
                      value={run ? formatDateNumeric(run.runDate) : "—"}
                    />
                    <Metric
                      label={t("crons.card.duration")}
                      value={
                        run
                          ? formatDuration(durationMs(run), i18n.language)
                          : "—"
                      }
                    />
                    <Metric
                      icon={Send}
                      label={t("crons.card.sent")}
                      value={String(run?.sentCount ?? 0)}
                    />
                  </div>
                  {run?.error ? (
                    <p
                      className="flex items-start gap-2 truncate rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive"
                      title={run.error}
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{run.error}</span>
                    </p>
                  ) : null}
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="text-xs text-muted-foreground">
                      {run
                        ? t("crons.card.started", {
                            value: formatDateTime(run.startedAt),
                          })
                        : t("crons.card.neverHint")}
                    </p>
                    <RunNowDialog jobName={job.name} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("crons.recent.title")}</CardTitle>
          <CardDescription>{t("crons.recent.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {runsQuery.isPending || !runsQuery.data ? (
            <KidsLoader label={t("loading")} size="sm" />
          ) : (
            <CronRunsTable
              data={runsQuery.data}
              onPageChange={setPage}
              toolbar={
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={jobName}
                    onValueChange={(value) => {
                      setJobName(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("crons.filters.allJobs")}
                      </SelectItem>
                      {(jobsQuery.data ?? []).map((job) => (
                        <SelectItem key={job.name} value={job.name}>
                          {t(`crons.jobNames.${job.name}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("crons.filters.allStatuses")}
                      </SelectItem>
                      {statuses.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`crons.status.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </p>
      <p
        className="nums mt-1 truncate font-semibold text-foreground"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
