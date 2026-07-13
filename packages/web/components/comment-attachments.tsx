"use client";

import type { CommentAttachment } from "@kichkintoy/shared";
import { useQuery } from "@tanstack/react-query";
import { FileText, PlayCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { orpc } from "@/lib/orpc";

function formatSize(bytes: number | null) { return bytes === null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function Item({ attachment }: { attachment: CommentAttachment }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["media", "download", attachment.mediaAssetId], queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: attachment.mediaAssetId }), staleTime: 4 * 60 * 1000 });
  const url = data?.downloadUrl;
  if (attachment.mediaType === "file") return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-xs">
      <FileText className="h-4 w-4 shrink-0" /><span className="max-w-52 truncate">{attachment.fileName ?? "File"}</span><span className="text-muted-foreground">{formatSize(attachment.sizeBytes)}</span>
    </a>
  );
  return <>
    <button type="button" disabled={!url} onClick={() => setOpen(true)} className="relative aspect-square w-[calc(50%-0.25rem)] overflow-hidden rounded-lg bg-muted">
      {url ? <img src={url} alt={attachment.fileName ?? ""} className="h-full w-full object-cover" /> : null}
      {attachment.mediaType === "video" ? <span className="absolute inset-0 grid place-items-center bg-black/20"><PlayCircle className="h-9 w-9 text-white" /></span> : null}
    </button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-4xl border-0 bg-black p-2">{url ? attachment.mediaType === "video" ? <video src={url} controls autoPlay className="max-h-[85vh] w-full" /> : <img src={url} alt={attachment.fileName ?? ""} className="max-h-[85vh] w-full object-contain" /> : null}</DialogContent></Dialog>
  </>;
}

export function CommentAttachments({ attachments }: { attachments: CommentAttachment[] }) {
  if (!attachments.length) return null;
  const media = attachments.filter((item) => item.mediaType !== "file");
  const files = attachments.filter((item) => item.mediaType === "file");
  return <div><div className="mt-2 flex flex-wrap gap-2">{media.map((item) => <Item key={item.mediaAssetId} attachment={item} />)}</div>{files.map((item) => <Item key={item.mediaAssetId} attachment={item} />)}</div>;
}
