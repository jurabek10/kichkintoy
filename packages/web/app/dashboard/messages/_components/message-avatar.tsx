"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

export function MessageAvatar({
  name,
  photoMediaAssetId,
  photoUrl,
  className,
}: {
  name: string;
  photoMediaAssetId: string | null;
  photoUrl: string | null;
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["media", "download", photoMediaAssetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: photoMediaAssetId! }),
    enabled: Boolean(photoMediaAssetId),
    staleTime: 240_000,
  });
  const imageUrl = data?.downloadUrl ?? photoUrl;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-grape text-sm font-bold text-grape-ink ring-1 ring-border/60",
        className,
      )}
      aria-hidden="true"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
