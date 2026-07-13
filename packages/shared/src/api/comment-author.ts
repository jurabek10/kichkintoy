import { z } from "zod";
import { uuidSchema } from "../lib/validators.js";

export const commentAuthorRoleSchema = z.enum(["director", "teacher", "parent"]);
export type CommentAuthorRole = z.infer<typeof commentAuthorRoleSchema>;

/**
 * How a comment's author should be shown. Center staff (teacher/director) show
 * their own name and avatar; a parent shows the child they guard in this context
 * (the report's child, or their child in the notice/album's class) instead of
 * their own name — resolved server-side. `authorName` still carries the real
 * account name for callers that need it.
 */
export const commentAuthorDisplaySchema = z.object({
  authorRole: commentAuthorRoleSchema,
  authorDisplayName: z.string(),
  // A media asset id (resolve via media.getDownloadUrl) when present...
  authorPhotoMediaAssetId: uuidSchema.nullable(),
  // ...otherwise a legacy direct URL, or null for a monogram fallback.
  authorPhotoUrl: z.string().nullable(),
});
export type CommentAuthorDisplay = z.infer<typeof commentAuthorDisplaySchema>;

export const commentAttachmentSchema = z.object({
  mediaAssetId: uuidSchema,
  mediaType: z.enum(["image", "video", "file"]),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  thumbnailUrl: z.string().nullable(),
});
export type CommentAttachment = z.infer<typeof commentAttachmentSchema>;
