"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus } from "lucide-react";
import type { NoticeSummary } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { toApiError } from "@/lib/api/errors";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { DirectorNoticeCard } from "./director-notice-card";

type NoticeStatusFilter = "all" | "draft" | "scheduled" | "published";

const FILTERS: NoticeStatusFilter[] = ["all", "published", "scheduled", "draft"];

export function StaffNotices({
  centerId,
}: {
  centerId: string | null;
  director: boolean;
}) {
  const { t } = useLayoutTranslation("notices");
  const [filter, setFilter] = useState<NoticeStatusFilter>("all");

  // Fetch the whole list once, then tab + count on the client so switching
  // filters is instant and each tab can show its own count.
  const {
    data: notices = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.notices.authorList(centerId ?? ""),
    queryFn: () => orpc.notices.authorList({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const counts = useMemo(() => countByStatus(notices), [notices]);
  const visible = useMemo(() => {
    const list =
      filter === "all"
        ? notices
        : notices.filter((notice) => notice.status === filter);
    return [...list].sort(byPinnedThenRecent);
  }, [notices, filter]);

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("staffDescription")}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/notices/new">
              <Plus className="h-4 w-4" />
              {t("newNotice")}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {t(filterLabel(key))}
              <span
                className={cn(
                  "tabular-nums rounded-full px-1.5 text-xs font-bold",
                  active
                    ? "bg-primary-foreground/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {isPending ? (
        <LoadingCard label={t("loading")} />
      ) : visible.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">
            {filter === "all" ? t("empty.staffTitle") : t("empty.filterTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? t("empty.staffBody") : t("empty.filterBody")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((notice) => (
            <DirectorNoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}

function countByStatus(notices: NoticeSummary[]) {
  const counts: Record<NoticeStatusFilter, number> = {
    all: notices.length,
    published: 0,
    scheduled: 0,
    draft: 0,
  };
  for (const notice of notices) {
    if (notice.status in counts) {
      counts[notice.status as NoticeStatusFilter] += 1;
    }
  }
  return counts;
}

/** Pinned notices float up; within a group, most recently active first. */
function byPinnedThenRecent(a: NoticeSummary, b: NoticeSummary) {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  return recencyOf(b) - recencyOf(a);
}

function recencyOf(notice: NoticeSummary) {
  return new Date(notice.publishedAt ?? notice.updatedAt).getTime();
}

function filterLabel(key: NoticeStatusFilter) {
  if (key === "all") return "filters.all";
  return `status.${key}`;
}
