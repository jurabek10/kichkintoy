"use client";

import { FileText, ImageIcon, Paperclip, Video, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc";

export const MAX_COMMENT_ATTACHMENTS = 4;
const IMAGE_OR_FILE_LIMIT = 25 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;

export type PendingCommentAttachment = { id: string; file: File; previewUrl: string | null };

export function CommentAttachmentPicker({ value, onChange, labels }: {
  value: PendingCommentAttachment[];
  onChange: (next: PendingCommentAttachment[]) => void;
  labels: { addPhoto: string; addVideo: string; addFile: string; limit: string; tooLarge: string };
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
              <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((entry) => entry.id !== item.id))} className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl bg-black/70 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label={labels.addPhoto} onClick={() => imageRef.current?.click()}><ImageIcon className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label={labels.addVideo} onClick={() => videoRef.current?.click()}><Video className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label={labels.addFile} onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
      </div>
      <input ref={imageRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
      <input ref={videoRef} hidden type="file" multiple accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
      <input ref={fileRef} hidden type="file" multiple accept="application/pdf,.doc,.docx" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
    </div>
  );
}

export async function uploadCommentAttachments(centerId: string, items: PendingCommentAttachment[]) {
  const ids: string[] = [];
  for (const item of items) {
    const mimeType = item.file.type || mimeTypeFromName(item.file.name);
    const signed = await orpc.media.createUploadUrl({ centerId, fileName: item.file.name, mimeType, sizeBytes: item.file.size, purpose: "comment" });
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
