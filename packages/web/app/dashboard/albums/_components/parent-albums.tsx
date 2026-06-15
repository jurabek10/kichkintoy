"use client";

import { useQuery } from "@tanstack/react-query";
import { Images } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { AlbumCard } from "./album-card";

export function ParentAlbums() {
  const { t } = useLayoutTranslation("albums");
  const {
    data: posts = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.albums.parentList(),
    queryFn: () => orpc.albums.parentList({}),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <LoadingCard label={t("loading")} />
      ) : posts.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Images className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{t("empty.parentTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("empty.parentBody")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <AlbumCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
