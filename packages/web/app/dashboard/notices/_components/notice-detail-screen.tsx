"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { NoticeComments } from "./notice-comments";

export function NoticeDetailScreen({
  noticeId,
  parent,
}: {
  noticeId: string;
  parent: boolean;
}) {
  const { t } = useLayoutTranslation("notices");
  const { session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const detailKey = parent
    ? queryKeys.notices.parentDetail(noticeId)
    : queryKeys.notices.authorDetail(noticeId);

  const {
    data: notice,
    isPending,
    error,
  } = useQuery({
    queryKey: detailKey,
    queryFn: () =>
      parent
        ? orpc.notices.parentDetail({ noticeId })
        : orpc.notices.authorDetail({ noticeId }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => orpc.notices.confirm({ noticeId }),
    onSuccess: async () => {
      toast.success(t("toast.confirmed"));
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => orpc.notices.publish({ noticeId, body: {} }),
    onSuccess: async () => {
      toast.success(t("toast.published"));
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => orpc.notices.delete({ noticeId }),
    onSuccess: async () => {
      toast(t("toast.deleted"));
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
      router.push("/dashboard/notices");
    },
  });

  if (isPending) {
    return <LoadingCard label={t("loading")} />;
  }

  if (!notice) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : t("detail.notFound")}
        </AlertDescription>
      </Alert>
    );
  }

  const actionError =
    confirmMutation.error ?? publishMutation.error ?? deleteMutation.error;
  const confirmed = !!notice.myConfirmedAt;
  const needsConfirm = notice.requiresConfirmation && !confirmed;
  const canManage =
    !parent &&
    (session?.user.role === "director" || notice.author.id === session?.user.id);

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/notices">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(actionError).message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          {/* Tags */}
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
            {notice.isPinned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sunshine px-2 py-0.5 text-[11px] font-bold text-sunshine-ink">
                <Bookmark className="h-3 w-3 fill-current" />
                {t("badges.pinned")}
              </span>
            ) : null}
            {!parent ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    STATUS_DOT[notice.status] ?? "bg-muted-foreground/40",
                  )}
                />
                {t(statusKey(notice.status))}
              </span>
            ) : null}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">
            {notice.title}
          </h1>

          {/* Author */}
          <div className="flex items-center gap-3 border-b pb-4">
            <NoticeAvatar name={notice.author.fullName} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">
                {notice.author.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(notice.publishedAt ?? notice.updatedAt)}
              </p>
            </div>
            {canManage ? (
              <div className="flex shrink-0 gap-2">
                {notice.status !== "published" ? (
                  <Button
                    size="sm"
                    onClick={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                    {t("detail.publish")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("detail.delete")}
                </Button>
              </div>
            ) : null}
          </div>

          {/* Body */}
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">
            {notice.body}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation — the one thing a parent does with a notice */}
      {parent && notice.requiresConfirmation ? (
        confirmed ? (
          <Card className="flex items-center gap-3 border-mint-ink/20 bg-mint/15 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-ink" />
            <p className="text-sm font-semibold text-foreground">
              {t("detail.youConfirmed", {
                date: formatDateTime(notice.myConfirmedAt),
              })}
            </p>
          </Card>
        ) : (
          <Card className="flex flex-col gap-3 border-sky-ink/20 bg-sky/15 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-sky-ink" />
              {t("detail.confirmPrompt")}
            </p>
            <Button
              className="shrink-0 bg-sky-ink hover:bg-sky-ink/90"
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("detail.confirm")}
            </Button>
          </Card>
        )
      ) : null}

      {/* Read receipts — the author's view */}
      {!parent ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("detail.readReceipts")}
            </CardTitle>
            <CardDescription>
              {t("readCount", {
                read: notice.readCount,
                total: notice.recipientCount,
              })}
              {notice.requiresConfirmation
                ? ` · ${t("confirmedCount", {
                    confirmed: notice.confirmedCount,
                    total: notice.recipientCount,
                  })}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notice.recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("detail.noReceipts")}
              </p>
            ) : (
              <div className="grid gap-2">
                {notice.recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex flex-col gap-1 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{recipient.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {recipient.childName}
                        {recipient.className ? ` · ${recipient.className}` : ""}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("detail.readAt", {
                        date: formatDateTime(recipient.readAt),
                      })}
                      {notice.requiresConfirmation
                        ? ` · ${t("detail.confirmedAt", {
                            date: formatDateTime(recipient.confirmedAt),
                          })}`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <NoticeComments
        noticeId={noticeId}
        centerId={notice.centerId}
        comments={notice.comments}
        canComment={notice.allowComments && notice.status === "published"}
        currentUserId={session?.user.id ?? ""}
        noticeAuthorId={notice.author.id}
        canModerate={canManage}
      />
    </div>
  );
}

function NoticeAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky/30 text-sm font-bold text-sky-ink">
      {initials(name)}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const STATUS_DOT: Record<string, string> = {
  published: "bg-mint",
  scheduled: "bg-sunshine",
  draft: "bg-muted-foreground/40",
};

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
