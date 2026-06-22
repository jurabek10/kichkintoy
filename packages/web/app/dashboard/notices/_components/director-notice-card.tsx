"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Megaphone,
  Pin,
  Star,
  Users,
} from "lucide-react";
import type { NoticeSummary } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDateTime } from "@/lib/format";
import { formatRelative } from "@/lib/date";
import { cn } from "@/lib/utils";

/** A notice from the author's side: lifecycle state drives the footer, and a
 *  read-receipt meter answers the director's real question — did it land? */
export function DirectorNoticeCard({ notice }: { notice: NoticeSummary }) {
  const { t, i18n } = useLayoutTranslation("notices");
  const KindIcon = notice.kind === "survey" ? ClipboardList : Megaphone;

  return (
    <Link href={`/dashboard/notices/${notice.id}`} className="block">
      <Card
        className={cn(
          "transition hover:border-primary/40 hover:shadow-pop",
          notice.isImportant && "border-coral/50 bg-coral/[0.03]",
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={notice.status} t={t} />
            {notice.isPinned ? (
              <Badge variant="secondary">
                <Pin className="h-3 w-3" />
                {t("badges.pinned")}
              </Badge>
            ) : null}
            {notice.isImportant ? (
              <Badge className="bg-coral text-coral-ink hover:bg-coral">
                <Star className="h-3 w-3 fill-current" />
                {t("badges.important")}
              </Badge>
            ) : null}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {t(audienceKey(notice.targetType))}
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <KindIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <h2 className="line-clamp-1 font-bold leading-snug">
                {notice.title}
              </h2>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {notice.bodyPreview}
              </p>
            </div>
          </div>

          <Footer notice={notice} t={t} lang={i18n.language} />
        </CardContent>
      </Card>
    </Link>
  );
}

/** Lifecycle-specific footer: reach for published, schedule for scheduled,
 *  a quiet draft note otherwise. */
function Footer({
  notice,
  t,
  lang,
}: {
  notice: NoticeSummary;
  t: TFunction<"notices">;
  lang: string;
}) {
  if (notice.status === "scheduled") {
    return (
      <div className="flex items-center gap-1.5 border-t pt-3 text-sm font-medium text-sunshine-ink">
        <Clock className="h-4 w-4" />
        {notice.scheduledAt
          ? t("scheduledFor", { date: formatDateTime(notice.scheduledAt) })
          : t("status.scheduled")}
      </div>
    );
  }

  if (notice.status !== "published") {
    return (
      <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>{t("draftNotSent")}</span>
        <span>{t("updatedAt", { date: formatDateTime(notice.updatedAt) })}</span>
      </div>
    );
  }

  const pct =
    notice.recipientCount > 0
      ? Math.round((notice.readCount / notice.recipientCount) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">
          {t("reads")}
        </span>
        <span className="tabular-nums font-bold">
          {t("readCount", {
            read: notice.readCount,
            total: notice.recipientCount,
          })}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-mint transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {notice.publishedAt
            ? formatRelative(notice.publishedAt, lang)
            : t("updatedAt", { date: formatDateTime(notice.updatedAt) })}
        </span>
        {notice.requiresConfirmation ? (
          <span className="inline-flex items-center gap-1 font-medium text-mint-ink">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("confirmedCount", {
              confirmed: notice.confirmedCount,
              total: notice.recipientCount,
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  published: "bg-mint",
  scheduled: "bg-sunshine",
  draft: "bg-muted-foreground/40",
};

function StatusPill({
  status,
  t,
}: {
  status: string;
  t: TFunction<"notices">;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          STATUS_DOT[status] ?? "bg-muted-foreground/40",
        )}
      />
      {t(statusKey(status))}
    </span>
  );
}

function statusKey(value: string) {
  if (value === "published") return "status.published";
  if (value === "scheduled") return "status.scheduled";
  return "status.draft";
}

function audienceKey(value: string) {
  if (value === "center") return "audience.center";
  if (value === "class") return "audience.class";
  return "audience.child";
}
