"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export function SignedSpecialMedia({
  mediaAssetId,
  mediaType,
}: {
  mediaAssetId: string;
  mediaType: string;
}) {
  const { data } = useQuery({
    queryKey: ["media", "download", mediaAssetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId }),
    staleTime: 240_000,
  });

  if (!data) {
    return <div className="h-40 rounded-md bg-muted" />;
  }

  if (mediaType === "video") {
    return (
      <video
        src={data.downloadUrl}
        controls
        className="h-40 w-full rounded-md object-cover"
      />
    );
  }

  return (
    <img
      src={data.downloadUrl}
      alt=""
      className="h-40 w-full rounded-md object-cover"
    />
  );
}
