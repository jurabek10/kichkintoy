"use client";

import Link from "next/link";
import { AlertCircle, Bookmark, CheckCircle2, Star } from "lucide-react";
import type { NoticeSummary } from "@kichkintoy/shared";
import { Card, CardContent } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A notice from the parent's side. State is the whole point: an unread notice
 * gets a sky rail and a bolder title; a pinned one a sunshine wash and bookmark;
 * an important one a coral tag. The footer answers "who, when, and does this need
 * me" — never the author's read counts, which mean nothing to a parent.
 */
export function ParentNoticeCard({ notice }: { notice: NoticeSummary }) {
  const { t } = useLayoutTranslation("notices");
  const unread = !notice.myReadAt;
  const confirmed = !!notice.myConfirmedAt;
  const needsConfirm = notice.requiresConfirmation && !confirmed;

  return (
    <Link href={`/dashboard/notices/${notice.id}`} className="block">
      <Card
        className={cn(
          "overflow-hidden transition hover:border-primary/40 hover:shadow-pop",
          unread && "border-l-4 border-l-sky-ink",
          notice.isPinned && "bg-sunshine/25",
        )}
      >
        <CardContent className="flex flex-col gap-2.5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {t(audienceKey(notice.targetType))}
            </span>
            {notice.isImportant ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-coral-ink">
                <Star className="h-3 w-3 fill-current" />
                {t("badges.important")}
              </span>
            ) : null}
            {unread ? (
              <span
                className="ml-auto h-2.5 w-2.5 rounded-full bg-sky-ink"
                role="status"
                aria-label={t("unread")}
              />
            ) : null}
          </div>

          <div className="flex items-start gap-1.5">
            {notice.isPinned ? (
              <Bookmark className="mt-0.5 h-4 w-4 shrink-0 fill-sky/30 text-sky-ink" />
            ) : null}
            <div className="min-w-0">
              <h2
                className={cn(
                  "line-clamp-2 leading-snug text-foreground",
                  unread ? "font-extrabold" : "font-semibold",
                )}
              >
                {notice.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {notice.bodyPreview}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/75">
              {notice.author.fullName}
            </span>
            <span>{formatDateTime(notice.publishedAt ?? notice.updatedAt)}</span>
            {notice.child ? <span>· {notice.child.name}</span> : null}
            {notice.requiresConfirmation ? (
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-1 font-bold",
                  needsConfirm ? "text-sky-ink" : "text-mint-ink",
                )}
              >
                {needsConfirm ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {needsConfirm ? t("badges.confirmation") : t("badges.confirmed")}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function audienceKey(value: string) {
  if (value === "center") return "audience.center";
  if (value === "class") return "audience.class";
  return "audience.child";
}
