"use client";

import Link from "next/link";
import { Heart, ImageIcon, MessageCircle } from "lucide-react";
import type { AlbumMedia, AlbumPostSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDate } from "@/lib/format";
import { SignedAlbumImage } from "./signed-album-image";

/** A director's album tile: photos are the face (a mosaic at a fixed aspect),
 *  with a tight, single-line footer so every card in the grid is the same
 *  height. Drafts wear a pill so they're easy to spot among published posts. */
export function DirectorAlbumCard({ post }: { post: AlbumPostSummary }) {
  const { t } = useLayoutTranslation("albums");
  const title = albumTitle(post) || t("card.emptyTitle");
  const classNames = post.classes.map((klass) => klass.name).join(", ");

  return (
    <Link href={`/dashboard/albums/${post.id}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition hover:border-primary/40 hover:shadow-pop">
        <div className="relative">
          <AlbumMosaic post={post} />
          {post.status === "draft" ? (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm backdrop-blur">
              {t("status.draft")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3.5">
          <h3 className="line-clamp-1 font-bold leading-snug">{title}</h3>

          <div className="flex items-center gap-1.5 text-xs">
            <Badge variant="secondary" className="shrink-0">
              {t(visibilityKey(post.visibility))}
            </Badge>
            {classNames ? (
              <span className="truncate text-muted-foreground">{classNames}</span>
            ) : null}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <span className="truncate">
              {post.author.fullName} ·{" "}
              {formatDate(post.publishedAt ?? post.updatedAt)}
            </span>
            <span className="flex shrink-0 items-center gap-2.5 tabular-nums">
              <Stat icon={ImageIcon} value={post.mediaCount} />
              <Stat icon={Heart} value={post.reactionSummary.heartCount} />
              <Stat icon={MessageCircle} value={post.commentCount} />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** One big frame beside two stacked, "+N" over the last when there's more. */
function AlbumMosaic({ post }: { post: AlbumPostSummary }) {
  const preview = post.previewMedia.length
    ? post.previewMedia
    : post.coverMedia
      ? [post.coverMedia]
      : [];
  const [big, ...rest] = preview;
  const small = rest.slice(0, 2);

  if (!big) {
    return (
      <div className="grid aspect-[3/2] place-items-center bg-muted">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const remaining = post.mediaCount - (1 + small.length);

  return (
    <div className="flex aspect-[3/2] w-full gap-0.5 bg-muted">
      <Frame media={big} more={small.length === 0 ? remaining : 0} />
      {small.length ? (
        <div className="flex w-2/5 flex-col gap-0.5">
          {small.map((media, index) => (
            <Frame
              key={media.id}
              media={media}
              more={index === small.length - 1 ? remaining : 0}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Frame({ media, more }: { media: AlbumMedia; more: number }) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <SignedAlbumImage
        mediaAssetId={media.assetId}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      {more > 0 ? (
        <div className="absolute inset-0 grid place-items-center bg-black/45">
          <span className="text-lg font-bold text-white">+{more}</span>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
}: {
  icon: typeof Heart;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}

function albumTitle(post: AlbumPostSummary) {
  const firstLine = post.caption.split("\n")[0]?.trim();
  return firstLine || post.bodyPreview;
}

function visibilityKey(value: string) {
  if (value === "class") return "visibility.class";
  return "visibility.taggedChildren";
}
