"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, ImageIcon, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { SignedAlbumImage } from "./signed-album-image";

export function AlbumDetailScreen({ postId }: { postId: string }) {
  const { t } = useLayoutTranslation("albums");
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const {
    data: post,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.albums.detail(postId),
    queryFn: () => orpc.albums.detail({ postId }),
  });

  const staff = session?.user.role !== "parent";

  const publishMutation = useMutation({
    mutationFn: () => orpc.albums.publish({ postId }),
    onSuccess: async () => {
      toast.success(t("toast.published"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.albums.all() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.albums.detail(postId),
      });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orpc.albums.delete({ postId }),
    onSuccess: async () => {
      toast.success(t("toast.deleted"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.albums.all() });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const reactionMutation = useMutation({
    mutationFn: () => orpc.albums.toggleReaction({ postId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.albums.detail(postId),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.albums.all() });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      orpc.albums.addComment({ postId, body: { body: comment } }),
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.albums.detail(postId),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.albums.all() });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;
    commentMutation.mutate();
  }

  if (isPending) {
    return (
      <LoadingCard label={t("loading")} />
    );
  }

  if (error || !post) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : t("detail.notFound")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/dashboard/albums">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
        {staff ? (
          <div className="flex gap-2">
            {post.status === "draft" ? (
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
      </div>

      <Card>
        <CardHeader className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t(statusKey(post.status))}</Badge>
            <Badge variant="outline">{t(visibilityKey(post.visibility))}</Badge>
            {post.classes.map((klass) => (
              <Badge key={klass.id} variant="secondary">
                {klass.name}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-xl">
            {post.caption || t("card.emptyTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("detail.authorDate", {
              author: post.author.fullName,
              date: post.publishedAt
                ? formatDateTime(post.publishedAt)
                : t("updatedAt", { date: formatDateTime(post.updatedAt) }),
            })}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          {post.media.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {post.media.map((media) => (
                <div
                  key={media.id}
                  className="overflow-hidden rounded-md border bg-muted"
                >
                  <SignedAlbumImage
                    mediaAssetId={media.assetId}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-md border bg-muted p-8">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {post.children.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.children.map((child) => (
                <Badge key={child.id} variant="outline">
                  {child.name}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={
                post.reactionSummary.myReaction === "heart"
                  ? "default"
                  : "outline"
              }
              onClick={() => reactionMutation.mutate()}
              disabled={reactionMutation.isPending}
              className={cn("gap-2")}
            >
              <Heart className="h-4 w-4" />
              {post.reactionSummary.heartCount}
            </Button>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {post.commentCount}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("detail.comments")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {post.allowComments && post.status === "published" ? (
            <form className="grid gap-2" onSubmit={submitComment}>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t("detail.writeComment")}
                rows={3}
              />
              <Button
                type="submit"
                className="w-fit"
                disabled={commentMutation.isPending || !comment.trim()}
              >
                <Send className="h-4 w-4" />
                {t("detail.comment")}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("detail.commentsDisabled")}
            </p>
          )}

          <div className="grid gap-3">
            {post.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("detail.noComments")}
              </p>
            ) : (
              post.comments.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.authorName}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {item.deletedAt ? t("detail.commentDeleted") : item.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function statusKey(value: string) {
  if (value === "published") return "status.published";
  return "status.draft";
}

function visibilityKey(value: string) {
  if (value === "class") return "visibility.class";
  return "visibility.taggedChildren";
}
