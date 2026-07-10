"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import type { NoticeSummary } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { PageHeading } from "@/components/page-heading";
import { toApiError } from "@/lib/api/errors";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSelectedChild } from "@/lib/selected-child";
import { cn } from "@/lib/utils";
import { NoticeTable } from "./notice-table";

type NoticeFilter = "all" | "unread" | "toConfirm";

const FILTERS: NoticeFilter[] = ["all", "unread", "toConfirm"];

export function ParentNotices() {
  const { t } = useLayoutTranslation("notices");
  const [filter, setFilter] = useState<NoticeFilter>("all");
  const [search, setSearch] = useState("");

  // Scoped to the globally selected kid (header switcher), so a kid at a
  // different kindergarten reads that center's notices.
  const { childId } = useSelectedChild();
  const {
    data: notices = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.notices.parentChildList(childId),
    queryFn: () => orpc.notices.parentChildList({ childId }),
    enabled: !!childId,
  });

  const counts = useMemo(
    () => ({
      all: notices.length,
      unread: notices.filter((notice) => !notice.myReadAt).length,
      toConfirm: notices.filter(isAwaitingConfirmation).length,
    }),
    [notices],
  );

  const visible = useMemo(() => {
    const list = notices.filter((notice) => matchesFilter(notice, filter));
    const query = search.trim().toLowerCase();
    const searched = query
      ? list.filter((notice) => noticeMatchesSearch(notice, query))
      : list;
    return [...searched].sort(byPinnedThenRecent);
  }, [filter, notices, search]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <PageHeading
            Icon={Bell}
            tone="sky"
            title={t("title")}
            description={t("parentDescription")}
          />
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {notices.length > 0 ? (
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
                {t(`filters.${key}`)}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-bold tabular-nums",
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
      ) : null}

      {isPending ? (
        <LoadingCard label={t("loading")} />
      ) : notices.length === 0 ? (
        <EmptyState
          title={t("empty.parentTitle")}
          body={t("empty.parentBody")}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t("empty.filterTitle")}
          body={
            filter === "unread"
              ? t("detail.emptyUnread")
              : t("detail.emptyToConfirm")
          }
        />
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <NoticeTable
              notices={visible}
              mode="parent"
              search={search}
              onSearchChange={setSearch}
              t={t}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="grid place-items-center gap-2 p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-sky/30">
        <Bell className="h-6 w-6 text-sky-ink" />
      </span>
      <p className="font-bold text-foreground">{title}</p>
      <p className="max-w-[40ch] text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}

function isAwaitingConfirmation(notice: NoticeSummary) {
  return notice.requiresConfirmation && !notice.myConfirmedAt;
}

function matchesFilter(notice: NoticeSummary, filter: NoticeFilter) {
  if (filter === "unread") return !notice.myReadAt;
  if (filter === "toConfirm") return isAwaitingConfirmation(notice);
  return true;
}

/** Pinned notices float up; within a group, most recently published first. */
function byPinnedThenRecent(a: NoticeSummary, b: NoticeSummary) {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  return recencyOf(b) - recencyOf(a);
}

function recencyOf(notice: NoticeSummary) {
  return new Date(notice.publishedAt ?? notice.updatedAt).getTime();
}

function noticeMatchesSearch(notice: NoticeSummary, query: string) {
  return [
    notice.title,
    notice.bodyPreview,
    notice.author.fullName,
    notice.centerName,
    notice.child?.name,
    notice.child?.className,
    notice.targets.map((target) => target.label).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}
