"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FileText, ImageIcon, MessageCircle, Search, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ContactPicker } from "./contact-picker";
import { MessageAvatar } from "./message-avatar";
import { messageIdentityParts } from "./message-identity";

export function ThreadList() {
  const { t, i18n } = useLayoutTranslation("messages");
  const [search, setSearch] = useState("");
  const query = useInfiniteQuery({
    queryKey: queryKeys.messages.threads(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => orpc.messages.threads({ cursor: pageParam ?? undefined, limit: 10 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const rows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (query.data?.pages.flatMap((page) => page.items) ?? []).filter(
      (thread) =>
        !needle ||
        messageIdentityParts(thread.otherParticipant, t).searchText.toLocaleLowerCase().includes(needle),
    );
  }, [query.data, search, t]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{t("subtitle")}</p>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        </div>
        <ContactPicker />
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          className="pl-9"
        />
      </div>
      <Card className="overflow-hidden border-border/70">
        {query.isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <div className="grid justify-items-center gap-2 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-grape text-grape-ink">
              <MessageCircle className="h-6 w-6" />
            </span>
            <p className="mt-2 font-semibold">{t("noMessages")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t("noMessagesBody")}</p>
            <div className="mt-2">
              <ContactPicker />
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((thread) => {
              const identity = messageIdentityParts(thread.otherParticipant, t);
              const unread = thread.unreadCount > 0;
              return (
                <Link
                  key={thread.threadId}
                  href={`/dashboard/messages/${thread.threadId}`}
                  className="group relative flex items-center gap-3 p-4 pl-5 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-grape-ink/30 opacity-0 transition group-hover:opacity-100" />
                  <MessageAvatar
                    name={identity.primary}
                    photoMediaAssetId={thread.otherParticipant.photoMediaAssetId}
                    photoUrl={thread.otherParticipant.photoUrl}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={cn("truncate", unread ? "font-bold" : "font-semibold")}>
                        {identity.primary}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-xs",
                          unread ? "font-semibold text-primary" : "text-muted-foreground",
                        )}
                      >
                        {formatThreadTime(thread.lastMessageAt, i18n.language)}
                      </span>
                    </span>
                    {identity.secondary ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {identity.secondary}
                      </span>
                    ) : null}
                    <span className="mt-0.5 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "truncate text-sm",
                          unread ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {thread.lastMessagePreview ? thread.lastMessagePreview : thread.lastMessageKind && thread.lastMessageKind !== "text" ? (
                          <span className="inline-flex items-center gap-1.5">
                            {thread.lastMessageKind === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : thread.lastMessageKind === "video" ? <Video className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                            {t(`previewKind.${thread.lastMessageKind}`)}
                          </span>
                        ) : t("deleted")}
                      </span>
                      {unread ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          className="mx-auto block text-sm font-semibold text-primary"
        >
          {t("loadMore")}
        </button>
      ) : null}
    </section>
  );
}

function formatThreadTime(value: string | null, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const sameDay =
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(date) ===
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(today);
  return new Intl.DateTimeFormat(
    locale,
    sameDay
      ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tashkent" }
      : { day: "2-digit", month: "short", timeZone: "Asia/Tashkent" },
  ).format(date);
}
