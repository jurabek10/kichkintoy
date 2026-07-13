"use client";

import { FileText, ImageIcon, Paperclip, Video, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { orpc } from "@/lib/orpc";

export const MAX_COMMENT_ATTACHMENTS = 4;
const IMAGE_OR_FILE_LIMIT = 25 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;

export type PendingCommentAttachment = { id: string; file: File; previewUrl: string | null };

export function CommentAttachmentPicker({ value, onChange, labels, variant = "default" }: {
  value: PendingCommentAttachment[];
  onChange: (next: PendingCommentAttachment[]) => void;
  labels: { addPhoto: string; addVideo: string; addFile: string; limit: string; tooLarge: string };
  variant?: "default" | "message";
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function add(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_COMMENT_ATTACHMENTS - value.length;
    if (files.length > remaining) toast.error(labels.limit);
    const accepted = Array.from(files).slice(0, remaining).filter((file) => {
      const max = file.type.startsWith("video/") ? VIDEO_LIMIT : IMAGE_OR_FILE_LIMIT;
      if (file.size > max) { toast.error(labels.tooLarge); return false; }
      return true;
    }).map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    onChange([...value, ...accepted]);
  }

  function remove(item: PendingCommentAttachment) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    onChange(value.filter((entry) => entry.id !== item.id));
  }

  const inputs = (
    <>
      <input ref={imageRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
      <input ref={videoRef} hidden type="file" multiple accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
      <input ref={fileRef} hidden type="file" multiple accept="application/pdf,.doc,.docx" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
    </>
  );

  if (variant === "message") {
    return (
      <div className="contents">
        {value.length ? (
          <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-muted/45 p-2">
            {value.map((item) => (
              <div key={item.id} className="relative flex h-14 min-w-40 max-w-56 items-center gap-2.5 rounded-xl border bg-card p-1.5 pr-7 shadow-sm">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sky-50 text-primary">
                    {item.file.type.startsWith("video/") ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{item.file.name}</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">{formatPendingSize(item.file.size)}</span>
                </span>
                <button type="button" aria-label="Remove" onClick={() => remove(item)} className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="absolute bottom-4 left-4 z-10">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label={labels.addFile}>
                <Paperclip className="h-[18px] w-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-52 p-2">
              <button type="button" onClick={() => { setMenuOpen(false); imageRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-primary"><ImageIcon className="h-4 w-4" /></span>{labels.addPhoto}</button>
              <button type="button" onClick={() => { setMenuOpen(false); videoRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600"><Video className="h-4 w-4" /></span>{labels.addVideo}</button>
              <button type="button" onClick={() => { setMenuOpen(false); fileRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600"><FileText className="h-4 w-4" /></span>{labels.addFile}</button>
            </PopoverContent>
          </Popover>
        </div>
        {inputs}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <div key={item.id} className="relative h-14 w-14 overflow-hidden rounded-lg border bg-muted">
              {item.previewUrl ? <img src={item.previewUrl} alt="" className="h-full w-full object-cover" /> : (
                <div className="grid h-full place-items-center px-1 text-muted-foreground">
                  {item.file.type.startsWith("video/") ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  <span className="w-full truncate text-center text-[9px]">{item.file.name}</span>
                </div>
              )}
              <button type="button" aria-label="Remove" onClick={() => remove(item)} className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl bg-black/70 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label={labels.addPhoto} onClick={() => imageRef.current?.click()}><ImageIcon className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label={labels.addVideo} onClick={() => videoRef.current?.click()}><Video className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label={labels.addFile} onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
      </div>
      {inputs}
    </div>
  );
}

function formatPendingSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function uploadCommentAttachments(centerId: string, items: PendingCommentAttachment[]) {
  return uploadAttachments(centerId, items, "comment");
}

export async function uploadMessageAttachments(centerId: string, items: PendingCommentAttachment[]) {
  return uploadAttachments(centerId, items, "message");
}

async function uploadAttachments(centerId: string, items: PendingCommentAttachment[], purpose: "comment" | "message") {
  const ids: string[] = [];
  for (const item of items) {
    const mimeType = item.file.type || mimeTypeFromName(item.file.name);
    const signed = await orpc.media.createUploadUrl({ centerId, fileName: item.file.name, mimeType, sizeBytes: item.file.size, purpose });
    const response = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: item.file });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    const asset = await orpc.media.completeUpload({ mediaAssetId: signed.mediaAssetId });
    ids.push(asset.id);
  }
  return ids;
}

function mimeTypeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}
