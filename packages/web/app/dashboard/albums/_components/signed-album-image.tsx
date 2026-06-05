"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { orpc } from "@/lib/orpc";

export function SignedAlbumImage({
  mediaAssetId,
  className,
}: {
  mediaAssetId: string;
  className?: string;
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["media", "download", mediaAssetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId }),
    staleTime: 240_000,
  });

  if (isPending || error || !data) {
    return (
      <div className="grid h-full min-h-40 w-full place-items-center bg-muted">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return <img src={data.downloadUrl} alt="" className={className} />;
}
