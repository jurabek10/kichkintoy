"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Pin, Users } from "lucide-react";
import type { NoticeSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NoticeCard({ notice }: { notice: NoticeSummary }) {
  const { t } = useLayoutTranslation("notices");
  const actionNeeded =
    notice.requiresConfirmation &&
    !notice.myConfirmedAt &&
    notice.status === "published";

  return (
    <Link href={`/dashboard/notices/${notice.id}`} className="block">
      <Card
        className={cn(
          "transition hover:border-primary/40 hover:shadow-pop",
          actionNeeded ? "border-primary/50" : "",
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {notice.isPinned ? (
              <Badge variant="secondary">
                <Pin className="h-3 w-3" />
                {t("badges.pinned")}
              </Badge>
            ) : null}
            {actionNeeded ? (
              <Badge>
                <AlertCircle className="h-3 w-3" />
                {t("badges.actionNeeded")}
              </Badge>
            ) : null}
            {!actionNeeded && notice.myConfirmedAt ? (
              <Badge variant="secondary">
                <CheckCircle2 className="h-3 w-3" />
                {t("badges.confirmed")}
              </Badge>
            ) : null}
            <Badge variant="outline">{t(statusKey(notice.status))}</Badge>
            <Badge variant="outline">
              {t(audienceKey(notice.targetType))}
            </Badge>
          </div>

          <div>
            <h2 className="line-clamp-2 text-base font-bold">{notice.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {notice.bodyPreview}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {notice.publishedAt
                ? formatDateTime(notice.publishedAt)
                : t("updatedAt", { date: formatDateTime(notice.updatedAt) })}
            </span>
            {notice.child ? <span>{notice.child.name}</span> : null}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t("readCount", {
                read: notice.readCount,
                total: notice.recipientCount,
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
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
