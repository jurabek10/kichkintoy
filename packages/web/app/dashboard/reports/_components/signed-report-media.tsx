"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc";

export function SignedReportMedia({
  mediaAssetId,
  mediaType,
}: {
  mediaAssetId: string;
  mediaType: string;
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["media", "download", mediaAssetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId }),
    staleTime: 4 * 60 * 1000,
  });

  if (isPending) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        Loading media…
      </div>
    );
  }

  if (error || !data?.downloadUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        Media unavailable
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <ReportMediaFrame downloadUrl={data.downloadUrl} mediaType={mediaType}>
        <video
          controls
          className="aspect-video w-full rounded-lg border bg-black object-contain"
          src={data.downloadUrl}
        >
          <track kind="captions" />
        </video>
      </ReportMediaFrame>
    );
  }

  return (
    <ReportMediaFrame downloadUrl={data.downloadUrl} mediaType={mediaType}>
      <img
        src={data.downloadUrl}
        alt="Report media"
        className="aspect-video w-full rounded-lg border object-cover"
      />
    </ReportMediaFrame>
  );
}

function ReportMediaFrame({
  children,
  downloadUrl,
  mediaType,
}: {
  children: ReactNode;
  downloadUrl: string;
  mediaType: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {children}
      <Button asChild type="button" variant="outline" size="sm">
        <a
          href={downloadUrl}
          download={`daily-report-${mediaType}`}
          target="_blank"
          rel="noreferrer"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </Button>
    </div>
  );
}
