"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DirectMessage, ThreadDetail } from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { MessageAvatar } from "./message-avatar";
import { messageIdentityParts } from "./message-identity";

export function Conversation({ threadId }: { threadId: string }) {
  const { t, i18n } = useLayoutTranslation("messages");
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Whether the user is at (or near) the newest message; new arrivals keep the
  // view pinned only in that case, so reading history is never interrupted.
  const pinnedRef = useRef(true);
  // scrollHeight captured before loading older messages, to keep the view still.
  const restoreHeightRef = useRef<number | null>(null);

  const query = useInfiniteQuery({
    queryKey: queryKeys.messages.thread(threadId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => orpc.messages.thread({ threadId, cursor: pageParam ?? undefined, limit: 10 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const thread = query.data?.pages[0]?.thread;
  const messages = useMemo(
    () => [...(query.data?.pages ?? [])].reverse().flatMap((page) => page.messages),
    [query.data],
  );

  useEffect(() => {
    if (!query.data) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.messages.threads() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });
  }, [query.data, queryClient]);

  const appendToCache = (message: DirectMessage) => {
    queryClient.setQueryData<InfiniteData<ThreadDetail, string | null>>(
      queryKeys.messages.thread(threadId),
      (data) => {
        const first = data?.pages[0];
        if (!data || !first) return data;
        if (data.pages.some((page) => page.messages.some((item) => item.id === message.id))) return data;
        return {
          ...data,
          pages: [{ ...first, messages: [...first.messages, message] }, ...data.pages.slice(1)],
        };
      },
    );
  };

  const send = useMutation({
    mutationFn: (text: string) => orpc.messages.send({ threadId, body: text }),
    onMutate: () => {
      setBody("");
      pinnedRef.current = true;
    },
    onSuccess: (message) => {
      appendToCache(message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages.threads() });
    },
    onError: (_error, text) => {
      setBody(text);
      toast.error(t("sendError"));
    },
  });
  const remove = useMutation({
    mutationFn: (messageId: string) => orpc.messages.deleteMessage({ messageId }),
    onSuccess: async () => {
      setDeleteId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.messages.thread(threadId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.messages.threads() }),
      ]);
    },
  });

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = () => {
    restoreHeightRef.current = scrollRef.current?.scrollHeight ?? null;
    void query.fetchNextPage();
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restoreHeightRef.current !== null) {
      el.scrollTop += el.scrollHeight - restoreHeightRef.current;
      restoreHeightRef.current = null;
    } else if (pinnedRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, send.isPending]);

  if (query.isLoading || !thread) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{t("loading")}</p>;
  }
  const identity = messageIdentityParts(thread.otherParticipant, t);
  const pendingBody = send.isPending ? send.variables : null;
  return (
    <section className="mx-auto max-w-4xl">
      <Card className="flex h-[calc(100dvh-8rem)] min-h-[28rem] flex-col overflow-hidden border-border/70">
        <header className="flex items-center gap-3 border-b bg-card/90 p-4 backdrop-blur">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/messages" aria-label={t("back")}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <MessageAvatar
            name={identity.primary}
            photoMediaAssetId={thread.otherParticipant.photoMediaAssetId}
            photoUrl={thread.otherParticipant.photoUrl}
            className="h-10 w-10"
          />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold sm:text-base">{identity.primary}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {identity.secondary ?? t(`roles.${thread.otherParticipant.role}`)}
            </p>
          </div>
        </header>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex flex-1 flex-col overflow-y-auto bg-muted/20 px-4 py-5 sm:px-8"
        >
          {query.hasNextPage ? (
            <button
              type="button"
              onClick={loadOlder}
              disabled={query.isFetchingNextPage}
              className="mx-auto mb-5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm ring-1 ring-border disabled:opacity-60"
            >
              {query.isFetchingNextPage ? t("loading") : t("loadMore")}
            </button>
          ) : null}
          <div className="mt-auto space-y-3">
            {messages.map((message, index) => {
              const mine = message.senderUserId === session?.user.id;
              const previous = messages[index - 1];
              const showDate = !previous || dateKey(previous.createdAt) !== dateKey(message.createdAt);
              return (
                <div key={message.id}>
                  {showDate ? (
                    <div className="my-5 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border/70" />
                      <span className="text-xs font-semibold text-muted-foreground">
                        {formatDate(message.createdAt, i18n.language)}
                      </span>
                      <span className="h-px flex-1 bg-border/70" />
                    </div>
                  ) : null}
                  <div className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                    {!mine ? (
                      <MessageAvatar
                        name={identity.primary}
                        photoMediaAssetId={thread.otherParticipant.photoMediaAssetId}
                        photoUrl={thread.otherParticipant.photoUrl}
                        className="h-7 w-7 rounded-xl text-[9px]"
                      />
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                        mine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-card ring-1 ring-border/60",
                      )}
                    >
                      {message.deletedAt ? (
                        <p className="italic opacity-70">{t("deleted")}</p>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      )}
                      <p
                        className={cn(
                          "mt-1 text-right text-[10px]",
                          mine ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {formatTime(message.createdAt, i18n.language)}
                      </p>
                    </div>
                    {mine && !message.deletedAt ? (
                      <button
                        type="button"
                        onClick={() => setDeleteId(message.id)}
                        aria-label={t("delete")}
                        className="mb-1 rounded-full p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {pendingBody ? (
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-primary/70 px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm">
                  <p className="whitespace-pre-wrap break-words">{pendingBody}</p>
                  <p className="mt-1 text-right text-[10px] text-primary-foreground/70">{t("sending")}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <form
          className="flex items-end gap-2 border-t bg-card p-3 sm:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const text = body.trim();
            if (text && !send.isPending) send.mutate(text);
          }}
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={1}
            placeholder={t("messagePlaceholder")}
            className="max-h-32 min-h-10 resize-none rounded-2xl"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const text = body.trim();
                if (text && !send.isPending) send.mutate(text);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            disabled={!body.trim() || send.isPending}
            aria-label={t("send")}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteId && remove.mutate(deleteId)}
            >
              {t("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date(value));
}
function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "Asia/Tashkent" }).format(
    new Date(value),
  );
}
function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
}
