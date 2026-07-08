"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { NoticeComment } from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CommentAvatar } from "@/components/comment-avatar";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

/**
 * The notice's comment thread — a conversation between the center and a parent.
 * Anyone who can see the notice can reply; staff (and a comment's own author)
 * can remove a reply. The author's own replies are tinted sky and tagged so the
 * center's voice reads apart from parents' at a glance.
 */
export function NoticeComments({
  noticeId,
  comments,
  canComment,
  currentUserId,
  noticeAuthorId,
  canModerate,
}: {
  noticeId: string;
  comments: NoticeComment[];
  /** Published and accepting comments. */
  canComment: boolean;
  currentUserId: string;
  noticeAuthorId: string;
  canModerate: boolean;
}) {
  const { t } = useLayoutTranslation("notices");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["notices"] });

  const addComment = useMutation({
    mutationFn: () =>
      orpc.notices.addComment({ noticeId, body: { body: draft.trim() } }),
    onSuccess: async () => {
      setDraft("");
      await refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) =>
      orpc.notices.deleteComment({ noticeId, commentId }),
    onSuccess: async () => {
      toast(t("toast.commentDeleted"));
      await refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    addComment.mutate();
  }

  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-sky-ink" />
        <h2 className="text-base font-bold text-foreground">
          {t("detail.comments")}
        </h2>
        {comments.length > 0 ? (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold tabular-nums text-muted-foreground">
            {comments.length}
          </span>
        ) : null}
      </div>

      {canComment ? (
        <form className="flex items-start gap-3" onSubmit={submit}>
          <CurrentUserAvatar
            fallbackName={t("detail.you")}
            className="h-9 w-9"
            textClassName="text-xs"
          />
          <div className="flex flex-1 flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("detail.writeComment")}
              rows={2}
              maxLength={2000}
            />
            <Button
              type="submit"
              size="sm"
              className="w-fit gap-1.5 self-end bg-sky-ink hover:bg-sky-ink/90"
              disabled={addComment.isPending || !draft.trim()}
            >
              <Send className="h-3.5 w-3.5" />
              {t("detail.post")}
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          {t("detail.commentsDisabled")}
        </p>
      )}

      {comments.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => {
            const isAuthor = comment.authorUserId === noticeAuthorId;
            const canDelete =
              !comment.deletedAt &&
              (canModerate || comment.authorUserId === currentUserId);
            return (
              <li key={comment.id} className="flex items-start gap-3">
                <CommentAvatar
                  name={comment.authorDisplayName}
                  mediaAssetId={comment.authorPhotoMediaAssetId}
                  photoUrl={comment.authorPhotoUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-bold text-foreground">
                      {comment.authorDisplayName}
                    </span>
                    {isAuthor ? (
                      <span className="rounded-full bg-sky/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-ink">
                        {t("detail.author")}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(comment.createdAt)}
                    </span>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => deleteComment.mutate(comment.id)}
                        disabled={deleteComment.isPending}
                        className="ml-auto text-muted-foreground transition-colors hover:text-coral-ink"
                        aria-label={t("detail.deleteComment")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 whitespace-pre-wrap text-sm leading-6",
                      comment.deletedAt
                        ? "italic text-muted-foreground"
                        : "text-foreground",
                    )}
                  >
                    {comment.deletedAt ? t("detail.commentDeleted") : comment.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : canComment ? (
        <p className="text-sm text-muted-foreground">
          {t("detail.startConversation")}
        </p>
      ) : null}
    </Card>
  );
}

