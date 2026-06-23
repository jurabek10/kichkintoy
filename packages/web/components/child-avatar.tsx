"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

// A child's `photoUrl` is either a legacy direct URL or — for photos uploaded
// through the app — a private media-asset id (a UUID) that must be exchanged
// for a short-lived signed URL before it can be shown.
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A child's photo, resolved from whichever form `photoUrl` takes, with the
 * child's initial as the fallback. Used in the class roster table and on the
 * child profile page so both render uploaded photos identically.
 */
export function ChildAvatar({
  name,
  photoUrl,
  className,
  textClassName,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
  textClassName?: string;
}) {
  const assetId = photoUrl && UUID.test(photoUrl) ? photoUrl : null;
  const directUrl = photoUrl && !UUID.test(photoUrl) ? photoUrl : null;

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
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-bold text-accent-foreground",
        className ?? "h-9 w-9 text-xs",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className={textClassName}>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
