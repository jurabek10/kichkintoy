"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

export function NoticeDetailScreen({
  noticeId,
  parent,
}: {
  noticeId: string;
  parent: boolean;
}) {
  const { t } = useLayoutTranslation("notices");
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
    return (
      <LoadingCard label={t("loading")} />
    );
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="outline">{t(statusKey(notice.status))}</Badge>
              <Badge variant="outline">{t(audienceKey(notice.targetType))}</Badge>
              {notice.requiresConfirmation ? (
                <Badge>{t("badges.confirmation")}</Badge>
              ) : null}
              {notice.isPinned ? (
                <Badge variant="secondary">{t("badges.pinned")}</Badge>
              ) : null}
            </div>
            <CardTitle className="text-2xl">{notice.title}</CardTitle>
            <CardDescription>
              {t("detail.authorDate", {
                author: notice.author.fullName,
                date: formatDateTime(notice.publishedAt ?? notice.updatedAt),
              })}
            </CardDescription>
          </div>
          {!parent ? (
            <div className="flex gap-2">
              {notice.status !== "published" ? (
                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                  {t("detail.publish")}
                </Button>
              ) : null}
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {t("detail.delete")}
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-7">
          {notice.body}
        </CardContent>
      </Card>

      {parent && notice.requiresConfirmation && !notice.myConfirmedAt ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">
              {t("detail.confirmPrompt")}
            </p>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("detail.confirm")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!parent ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("detail.readReceipts")}</CardTitle>
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
    </div>
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
