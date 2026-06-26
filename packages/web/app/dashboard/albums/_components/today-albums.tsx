"use client";

import Link from "next/link";
import { Heart, ImageIcon, MessageCircle, Sparkles } from "lucide-react";
import type { AlbumPostSummary } from "@kichkintoy/shared";
import { Card } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDate } from "@/lib/format";
import { AlbumMosaic } from "./album-mosaic";
import { albumDate, albumTitle, dayKey, todayKey } from "./album-helpers";

/**
 * The hero of the parent's album page: today's photos, large and tappable. When
 * nothing was posted today it falls back to the single latest album so the spot
 * is never empty. A mosaic carries the brief — a parent comes here for the
 * pictures — while the table below stays the quiet way to browse everything.
 */
export function TodayAlbums({ posts }: { posts: AlbumPostSummary[] }) {
  const { t, i18n } = useLayoutTranslation("albums");

  const today = todayKey();
  const byNewest = [...posts].sort(
    (a, b) => +new Date(albumDate(b)) - +new Date(albumDate(a)),
  );
  const todays = byNewest.filter((post) => dayKey(albumDate(post)) === today);
  const featured = todays.length > 0 ? todays.slice(0, 4) : byNewest.slice(0, 1);

  if (featured.length === 0) return null;

  const isToday = todays.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-grape/20 text-grape-ink">
          <Sparkles className="h-4 w-4" />
        </span>
        <h2 className="text-base font-extrabold tracking-tight text-foreground">
          {isToday ? t("today") : t("latest")}
        </h2>
        {isToday ? (
          <span className="text-sm font-medium text-muted-foreground">
            {formatDate(new Date().toISOString())}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {featured.map((post) => (
          <FeatureCard
            key={post.id}
            post={post}
            title={albumTitle(post, t)}
            dateLabel={formatDate(albumDate(post))}
            photosLabel={t("photosCount", { count: post.mediaCount })}
          />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  post,
  title,
  dateLabel,
  photosLabel,
}: {
  post: AlbumPostSummary;
  title: string;
  dateLabel: string;
  photosLabel: string;
}) {
  return (
    <Link href={`/dashboard/albums/${post.id}`} className="group block">
      <Card className="overflow-hidden transition group-hover:border-primary/40 group-hover:shadow-pop">
        <div className="aspect-[16/10] w-full overflow-hidden">
          <AlbumMosaic
            previewMedia={post.previewMedia}
            mediaCount={post.mediaCount}
          />
        </div>
        <div className="flex flex-col gap-2 p-4">
          {post.classes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {post.classes.slice(0, 3).map((klass) => (
                <span
                  key={klass.id}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {klass.name}
                </span>
              ))}
            </div>
          ) : null}

          <p className="line-clamp-2 font-bold leading-snug text-foreground">
            {title}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/75">
              {post.author.fullName}
            </span>
            <span>{dateLabel}</span>
            <span className="ml-auto flex items-center gap-3 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                {post.mediaCount}
              </span>
              <span className="inline-flex items-center gap-1 text-coral-ink">
                <Heart className="h-3.5 w-3.5 fill-current" />
                {post.reactionSummary.heartCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {post.commentCount}
              </span>
            </span>
            <span className="sr-only">{photosLabel}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
