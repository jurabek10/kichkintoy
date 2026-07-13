"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ArrowLeft, FileText, LoaderCircle, Send, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import type { DirectMessage, ThreadDetail } from "@kichkintoy/shared";
import {
  CommentAttachmentPicker,
  uploadMessageAttachments,
  type PendingCommentAttachment,
} from "@/components/comment-attachment-picker";
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
import { MessageAttachments } from "./message-attachments";
import { messageIdentityParts } from "./message-identity";

export function Conversation({ threadId }: { threadId: string }) {
  const { t, i18n } = useLayoutTranslation("messages");
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingCommentAttachment[]>([]);
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
    mutationFn: async (draft: { body?: string; attachments: PendingCommentAttachment[] }) => {
      const attachmentMediaAssetIds = await uploadMessageAttachments(
        thread!.centerId,
        draft.attachments,
      );
      return orpc.messages.send({
        threadId,
        body: draft.body,
        attachmentMediaAssetIds,
      });
    },
    onMutate: () => {
      setBody("");
      setAttachments([]);
      pinnedRef.current = true;
    },
    onSuccess: (message, draft) => {
      draft.attachments.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      appendToCache(message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages.threads() });
    },
    onError: (_error, draft) => {
      setBody(draft.body ?? "");
      setAttachments(draft.attachments);
      toast.error(t("uploadFailed"));
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
  const pendingDraft = send.isPending ? send.variables : null;
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
                    <div className="max-w-[82%] space-y-1.5">
                      {!message.deletedAt && message.attachments.length ? (
                        <MessageAttachments
                          attachments={message.attachments}
                          overlayTime={
                            !message.body && message.attachments.every((item) => item.mediaType !== "file")
                              ? formatTime(message.createdAt, i18n.language)
                              : undefined
                          }
                        />
                      ) : null}
                      {message.deletedAt || message.body ? (
                        <div
                          className={cn(
                            "w-fit max-w-full rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                            mine
                              ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md bg-card ring-1 ring-border/60",
                          )}
                        >
                          {message.deletedAt ? (
                            <p className="italic opacity-70">{t("deleted")}</p>
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          )}
                          <p className={cn("mt-1 text-right text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {formatTime(message.createdAt, i18n.language)}
                          </p>
                        </div>
                      ) : message.attachments.some((item) => item.mediaType === "file") ? (
                        <p className="pr-1 text-right text-[10px] text-muted-foreground">
                          {formatTime(message.createdAt, i18n.language)}
                        </p>
                      ) : null}
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
            {pendingDraft ? (
              <div className="flex justify-end opacity-80">
                <div className="max-w-[82%] space-y-1.5">
                  {pendingDraft.attachments.length ? <PendingMessageAttachments items={pendingDraft.attachments} /> : null}
                  {pendingDraft.body ? (
                    <div className="ml-auto w-fit max-w-full rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm">
                      <p className="whitespace-pre-wrap break-words">{pendingDraft.body}</p>
                    </div>
                  ) : null}
                  <p className="flex items-center justify-end gap-1.5 pr-1 text-[10px] font-medium text-muted-foreground">
                    <LoaderCircle className="h-3 w-3 animate-spin" />
                    {t("sending")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <form
          className="relative grid gap-2 border-t bg-card p-3 sm:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const text = body.trim();
            if ((text || attachments.length) && !send.isPending) send.mutate({ body: text || undefined, attachments });
          }}
        >
          <CommentAttachmentPicker
            variant="message"
            value={attachments}
            onChange={setAttachments}
            labels={{
              addPhoto: t("attachPhoto"),
              addVideo: t("attachVideo"),
              addFile: t("attachFile"),
              limit: t("attachmentLimit", { count: 4 }),
              tooLarge: t("attachmentTooLarge"),
            }}
          />
          <div className="flex items-end gap-2">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              rows={1}
              placeholder={t("messagePlaceholder")}
              className="max-h-32 min-h-11 resize-none rounded-full border-border/80 bg-muted/45 py-3 pl-12 pr-4 shadow-none transition focus-visible:bg-card"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  const text = body.trim();
                  if ((text || attachments.length) && !send.isPending) send.mutate({ body: text || undefined, attachments });
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md"
              disabled={(!body.trim() && !attachments.length) || send.isPending}
              aria-label={t("send")}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
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

function PendingMessageAttachments({ items }: { items: PendingCommentAttachment[] }) {
  const images = items.filter((item) => item.previewUrl);
  const other = items.filter((item) => !item.previewUrl);
  return (
    <div className="w-[min(22rem,68vw)] space-y-1.5">
      {images.length ? (
        <div className={cn("relative grid overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-black/5", images.length === 1 ? "grid-cols-1" : "grid-cols-2 gap-0.5")}>
          {images.map((item) => <img key={item.id} src={item.previewUrl!} alt="" className={cn("w-full object-cover", images.length === 1 ? "aspect-[4/3]" : "aspect-square")} />)}
          {images.length + other.length > 1 ? <span className="absolute right-2 top-2 rounded-full bg-slate-950/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">+{images.length + other.length - 1}</span> : null}
        </div>
      ) : null}
      {other.map((item) => (
        <div key={item.id} className="flex min-w-64 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-primary">{item.file.type.startsWith("video/") ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.file.name}</span><span className="mt-0.5 block text-[11px] font-medium text-slate-500">{formatPendingFileSize(item.file.size)}</span></span>
        </div>
      ))}
    </div>
  );
}

function formatPendingFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
