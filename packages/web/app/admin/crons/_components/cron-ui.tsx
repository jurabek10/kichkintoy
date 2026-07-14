import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdminCronRun, CronRunStatus } from "@kichkintoy/shared";
import type { TFunction } from "i18next";

const statusVariant: Record<
  CronRunStatus,
  "success" | "warning" | "destructive"
> = {
  succeeded: "success",
  running: "warning",
  failed: "destructive",
};

export function CronStatusBadge({
  status,
  t,
}: {
  status: CronRunStatus | "never";
  t: TFunction;
}) {
  if (status === "never")
    return <Badge variant="secondary">{t("crons.status.never")}</Badge>;
  return (
    <Badge variant={statusVariant[status]} className="gap-1.5">
      {status === "running" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {t(`crons.status.${status}`)}
    </Badge>
  );
}

export function durationMs(run: AdminCronRun): number | null {
  if (!run.finishedAt) return null;
  return Math.max(
    0,
    new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime(),
  );
}

export function formatDuration(
  milliseconds: number | null,
  locale: string,
): string {
  if (milliseconds === null) return "—";
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(milliseconds / 1000)} s`;
}

export function statusRail(status: CronRunStatus | "never") {
  return cn(
    "absolute inset-y-0 left-0 w-1",
    status === "succeeded" && "bg-mint-ink",
    status === "failed" && "bg-destructive",
    status === "running" && "animate-pulse bg-sunshine-ink",
    status === "never" && "bg-muted-foreground/35",
  );
}
