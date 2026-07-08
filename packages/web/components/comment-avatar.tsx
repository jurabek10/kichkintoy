"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

// A comment author's photo is delivered as either a private media-asset id
// (a UUID, exchanged for a short-lived signed URL) or a legacy direct URL.
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The avatar shown next to a comment. Center staff (teacher/director) show their
 * own photo; a parent shows the child they guard in this context — the API
 * resolves both the display name and the photo, so this only renders them.
 * Mirrors the parent/teacher mobile comment threads.
 */
export function CommentAvatar({
  name,
  mediaAssetId,
  photoUrl,
  className,
}: {
  name: string;
  mediaAssetId: string | null;
  photoUrl: string | null;
  className?: string;
}) {
  const assetId =
    mediaAssetId ?? (photoUrl && UUID.test(photoUrl) ? photoUrl : null);
  const directUrl =
    !mediaAssetId && photoUrl && !UUID.test(photoUrl) ? photoUrl : null;

  const { data } = useQuery({
    queryKey: ["media", "download", assetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: assetId! }),
    enabled: Boolean(assetId),
    staleTime: 240_000,
  });

  const src = directUrl ?? data?.downloadUrl ?? null;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xs font-bold text-accent-foreground",
        className ?? "h-9 w-9",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
