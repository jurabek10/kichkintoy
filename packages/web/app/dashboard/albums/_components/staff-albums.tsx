"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Images, Plus } from "lucide-react";
import type { AlbumPostSummary } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { DirectorAlbumCard } from "./director-album-card";

type AlbumStatusFilter = "all" | "published" | "draft";

const FILTERS: AlbumStatusFilter[] = ["all", "published", "draft"];

export function StaffAlbums({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("albums");
  const [filter, setFilter] = useState<AlbumStatusFilter>("all");

  // One fetch, then tab + count on the client so switching is instant.
  const {
    data: posts = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.albums.staffList(centerId ?? ""),
    queryFn: () => orpc.albums.staffList({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const counts = useMemo(() => countByStatus(posts), [posts]);
  const visible = useMemo(
    () =>
      filter === "all"
        ? posts
        : posts.filter((post) => post.status === filter),
    [posts, filter],
  );

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("staffDescription")}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/albums/new">
              <Plus className="h-4 w-4" />
              {t("newAlbum")}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {t(filterLabel(key))}
              <span
                className={cn(
                  "tabular-nums rounded-full px-1.5 text-xs font-bold",
                  active
                    ? "bg-primary-foreground/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {isPending ? (
        <LoadingCard label={t("loading")} />
      ) : visible.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Images className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">
            {filter === "all" ? t("empty.staffTitle") : t("empty.filterTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? t("empty.staffBody") : t("empty.filterBody")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((post) => (
            <DirectorAlbumCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function countByStatus(posts: AlbumPostSummary[]) {
  const counts: Record<AlbumStatusFilter, number> = {
    all: posts.length,
    published: 0,
    draft: 0,
  };
  for (const post of posts) {
    if (post.status in counts) {
      counts[post.status as AlbumStatusFilter] += 1;
    }
  }
  return counts;
}

function filterLabel(key: AlbumStatusFilter) {
  if (key === "all") return "filters.all";
  return `status.${key}`;
}
