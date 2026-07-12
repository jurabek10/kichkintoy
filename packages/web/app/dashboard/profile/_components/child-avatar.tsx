"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

/**
 * A child's photo for the parent My Page. Prefers the signed media asset, falls
 * back to a legacy signup URL, then to the child's initial. The candy `ring`
 * (passed by the caller) gives each sibling a stable, distinct accent.
 */
export function ChildAvatar({
  mediaAssetId,
  photoUrl,
  name,
  className,
  ringClassName,
}: {
  mediaAssetId: string | null;
  photoUrl: string | null;
  name: string;
  className?: string;
  ringClassName?: string;
}) {
  const { data } = useQuery({
    queryKey: ["media", "download", mediaAssetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: mediaAssetId! }),
    enabled: Boolean(mediaAssetId),
    staleTime: 240_000,
  });

  const src = mediaAssetId ? data?.downloadUrl : photoUrl;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(src && src !== failedSrc);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary ring-2 ring-offset-2 ring-offset-card",
        ringClassName,
        className,
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src!)}
        />
      ) : (
        <span className="text-lg font-bold">
          {name.trim().slice(0, 1).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
