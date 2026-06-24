"use client";

import { Image as ImageIcon, MessageCircle, ListChecks } from "lucide-react";
import type { TFunction } from "i18next";
import type { DailyReportSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { ChildAvatar } from "@/components/child-avatar";
import { formatTime } from "@/lib/date";
import { reportStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Name + photo, the way the children roster renders a child, so a teacher
 *  recognises the same face across the app. */
export function ReportChildCell({
  name,
  photoUrl,
  subtitle,
}: {
  name: string;
  photoUrl: string | null;
  subtitle?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ChildAvatar name={name} photoUrl={photoUrl} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Photos / comments / items at a glance — icon + count, with photos tinted so
 *  the eye lands first on whether a report actually has pictures. */
export function ReportContentCell({
  report,
  t,
}: {
  report: Pick<
    DailyReportSummary,
    "photoCount" | "commentCount" | "itemCount"
  > | null;
  t: TFunction<"reports">;
}) {
  if (!report) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const { photoCount, commentCount, itemCount } = report;
  if (!photoCount && !commentCount && !itemCount) {
    return (
      <span className="text-sm text-muted-foreground">{t("summary.empty")}</span>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <ContentCount
        icon={ImageIcon}
        value={photoCount}
        label={t("summary.photos", { count: photoCount })}
        tone="coral"
      />
      <ContentCount
        icon={MessageCircle}
        value={commentCount}
        label={t("summary.comments", { count: commentCount })}
      />
      <ContentCount
        icon={ListChecks}
        value={itemCount}
        label={t("summary.items", { count: itemCount })}
      />
    </div>
  );
}

function ContentCount({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof ImageIcon;
  value: number;
  label: string;
  tone?: "coral";
}) {
  const active = value > 0;
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 text-sm tabular-nums",
        active
          ? tone === "coral"
            ? "font-semibold text-coral-ink"
            : "font-semibold text-foreground"
          : "text-muted-foreground/50",
      )}
    >
      <Icon className="h-4 w-4" />
      {value}
    </span>
  );
}

/** The time the report reached parents (published) or was last touched (draft),
 *  with a tiny "Draft" hint so an un-sent row reads differently from a sent one. */
export function ReportTimeCell({
  report,
  t,
}: {
  report: Pick<DailyReportSummary, "status" | "publishedAt" | "updatedAt"> | null;
  t: TFunction<"reports">;
}) {
  if (!report) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const stamp =
    report.status === "published" && report.publishedAt
      ? report.publishedAt
      : report.updatedAt;
  return (
    <div className="leading-tight">
      <span className="nums tabular-nums text-sm font-medium">
        {formatTime(stamp)}
      </span>
      {report.status !== "published" ? (
        <span className="block text-[11px] text-muted-foreground">
          {t(`status.${report.status}`, {
            defaultValue: reportStatusLabel(report.status),
          })}
        </span>
      ) : null}
    </div>
  );
}

/** Published / scheduled / draft / missing as a colored pill. */
export function ReportStatusBadge({
  report,
  t,
}: {
  report: Pick<DailyReportSummary, "status"> | null;
  t: TFunction<"reports">;
}) {
  if (!report) {
    return <Badge variant="destructive">{t("filters.missing")}</Badge>;
  }
  return (
    <Badge
      variant={
        report.status === "published"
          ? "success"
          : report.status === "scheduled"
            ? "warning"
            : "secondary"
      }
    >
      {t(`status.${report.status}`, {
        defaultValue: reportStatusLabel(report.status),
      })}
    </Badge>
  );
}

/** Builds the `/dashboard/reports/new` link with the child + date prefilled. */
export function newReportHref({
  childId,
  childName,
  centerId,
  reportDate,
}: {
  childId: string;
  childName: string;
  centerId: string;
  reportDate: string;
}) {
  const params = new URLSearchParams({
    childId,
    childName,
    centerId,
    reportDate,
  });
  return `/dashboard/reports/new?${params.toString()}`;
}
