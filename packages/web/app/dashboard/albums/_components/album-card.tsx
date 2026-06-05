"use client";

import Link from "next/link";
import { Heart, ImageIcon, MessageCircle } from "lucide-react";
import type { AlbumPostSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  albumStatusLabel,
  albumVisibilityLabel,
  formatDateTime,
} from "@/lib/format";
import { SignedAlbumImage } from "./signed-album-image";

export function AlbumCard({ post }: { post: AlbumPostSummary }) {
  return (
    <Link href={`/dashboard/albums/${post.id}`} className="block">
      <Card className="overflow-hidden transition hover:border-primary/40 hover:shadow-pop">
        {post.coverMedia ? (
          <div className="aspect-[16/9] bg-muted">
            <SignedAlbumImage
              mediaAssetId={post.coverMedia.assetId}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="grid aspect-[16/9] place-items-center bg-muted">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <CardContent className="grid gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{albumStatusLabel(post.status)}</Badge>
            <Badge variant="outline">
              {albumVisibilityLabel(post.visibility)}
            </Badge>
            {post.classes.slice(0, 2).map((klass) => (
              <Badge key={klass.id} variant="secondary">
                {klass.name}
              </Badge>
            ))}
          </div>
          <p className="line-clamp-2 min-h-10 text-sm font-semibold">
            {post.bodyPreview || "Album post"}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {post.publishedAt
                ? formatDateTime(post.publishedAt)
                : `Updated ${formatDateTime(post.updatedAt)}`}
            </span>
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                {post.mediaCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {post.reactionSummary.heartCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {post.commentCount}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
