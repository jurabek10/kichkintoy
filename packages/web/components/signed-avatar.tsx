"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

/**
 * Renders a user's avatar from a private media asset (resolved to a short-lived
 * signed URL), falling back to their initials when no photo is set. Mirrors the
 * `SignedAlbumImage` pattern used elsewhere in the dashboard.
 */
export function SignedAvatar({
  mediaAssetId,
  name,
  className,
  textClassName = "text-xl",
}: {
  mediaAssetId: string | null;
  name: string;
  className?: string;
  textClassName?: string;
}) {
  const { data } = useQuery({
    queryKey: ["media", "download", mediaAssetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: mediaAssetId! }),
    enabled: Boolean(mediaAssetId),
    staleTime: 240_000,
  });

  return (
    <span
      className={cn(
        "grid place-items-center overflow-hidden rounded-full bg-primary/10 text-primary ring-1 ring-border",
        className,
      )}
    >
      {data?.downloadUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.downloadUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={cn("font-bold tracking-tight", textClassName)}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
