"use client";

import type { MessageAttachment } from "@kichkintoy/shared";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Play } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

function formatSize(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function MediaItem({ attachment, single }: { attachment: MessageAttachment; single: boolean }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["media", "download", attachment.mediaAssetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: attachment.mediaAssetId }),
    staleTime: 4 * 60 * 1000,
  });
  const url = data?.downloadUrl;

  return (
    <>
      <button
        type="button"
        disabled={!url}
        onClick={() => setOpen(true)}
        className={cn(
          "group/media relative block overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          single ? "aspect-[4/3] w-full" : "aspect-square",
        )}
      >
        {url && attachment.mediaType === "image" ? (
          <img
            src={url}
            alt={attachment.fileName ?? ""}
            className="h-full w-full object-cover transition duration-300 group-hover/media:scale-[1.025]"
          />
        ) : null}
        {attachment.mediaType === "video" ? (
          <span className="absolute inset-0 grid place-items-center bg-slate-950/15">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-slate-900 shadow-lg transition group-hover/media:scale-105">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>
        ) : null}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl border-0 bg-slate-950 p-2 shadow-2xl">
          {url ? attachment.mediaType === "video" ? (
            <video src={url} controls autoPlay className="max-h-[88vh] w-full rounded-lg" />
          ) : (
            <img src={url} alt={attachment.fileName ?? ""} className="max-h-[88vh] w-full rounded-lg object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FileItem({ attachment }: { attachment: MessageAttachment }) {
  const { data } = useQuery({
    queryKey: ["media", "download", attachment.mediaAssetId],
    queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: attachment.mediaAssetId }),
    staleTime: 4 * 60 * 1000,
  });
  return (
    <a
      href={data?.downloadUrl}
      aria-disabled={!data?.downloadUrl}
      onClick={(event) => { if (!data?.downloadUrl) event.preventDefault(); }}
      target="_blank"
      rel="noreferrer"
      className="group/file flex min-w-64 max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 aria-disabled:pointer-events-none aria-disabled:opacity-70"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-primary">
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{attachment.fileName ?? "File"}</span>
        <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
          {[fileTypeLabel(attachment), formatSize(attachment.sizeBytes)].filter(Boolean).join(" · ")}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-slate-400 transition group-hover/file:text-primary" />
    </a>
  );
}

function fileTypeLabel(attachment: MessageAttachment) {
  const name = attachment.fileName?.toLowerCase() ?? "";
  if (name.endsWith(".docx")) return "DOCX";
  if (name.endsWith(".doc")) return "DOC";
  if (name.endsWith(".pdf")) return "PDF";
  return "FILE";
}

export function MessageAttachments({
  attachments,
  overlayTime,
}: {
  attachments: MessageAttachment[];
  overlayTime?: string;
}) {
  const media = attachments.filter((item) => item.mediaType !== "file");
  const files = attachments.filter((item) => item.mediaType === "file");
  if (!attachments.length) return null;

  return (
    <div className="space-y-1.5">
      {media.length ? (
        <div
          className={cn(
            "relative grid w-[min(22rem,68vw)] overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-black/5",
            media.length === 1 ? "grid-cols-1" : "grid-cols-2 gap-0.5",
          )}
        >
          {media.map((item) => (
            <MediaItem key={item.mediaAssetId} attachment={item} single={media.length === 1} />
          ))}
          {overlayTime ? (
            <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-slate-950/55 px-2 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur-sm">
              {overlayTime}
            </span>
          ) : null}
        </div>
      ) : null}
      {files.map((item) => <FileItem key={item.mediaAssetId} attachment={item} />)}
    </div>
  );
}
