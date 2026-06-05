"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Images, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { AlbumCard } from "./album-card";

type AlbumStatusFilter = "all" | "draft" | "published";

export function StaffAlbums({ centerId }: { centerId: string | null }) {
  const [status, setStatus] = useState<AlbumStatusFilter>("all");
  const {
    data: posts = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.albums.staffList(centerId ?? "", status),
    queryFn: () =>
      orpc.albums.staffList({
        centerId: centerId!,
        status: status === "all" ? undefined : status,
      }),
    enabled: !!centerId,
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Your account is not linked to a center yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Albums</CardTitle>
            <CardDescription>
              Share class photos with parents using child-safe visibility.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as AlbumStatusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/dashboard/albums/new">
                <Plus className="h-4 w-4" />
                New album
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : posts.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Images className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">No album posts yet</p>
          <p className="text-sm text-muted-foreground">
            Publish class photos when you are ready.
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
