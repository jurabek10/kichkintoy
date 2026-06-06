import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const mediaPurposeValues = [
  "album",
  "meal",
  "medication",
  "daily_report",
  "notice",
  "child_profile",
] as const;
export const mediaPurposeSchema = z.enum(mediaPurposeValues);
export type MediaPurpose = z.infer<typeof mediaPurposeSchema>;

export const createMediaUploadUrlInputSchema = z.object({
  centerId: uuidSchema,
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(3).max(120),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
  purpose: mediaPurposeSchema,
});
export type CreateMediaUploadUrlInput = z.infer<
  typeof createMediaUploadUrlInputSchema
>;

export const mediaUploadUrlSchema = z.object({
  mediaAssetId: uuidSchema,
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  expiresAt: isoDateTimeSchema,
});
export type MediaUploadUrl = z.infer<typeof mediaUploadUrlSchema>;

export const completeMediaUploadInputSchema = z.object({
  mediaAssetId: uuidSchema,
});
export type CompleteMediaUploadInput = z.infer<
  typeof completeMediaUploadInputSchema
>;

export const mediaAssetSchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  fileUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  mediaType: z.string(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  createdAt: isoDateTimeSchema,
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const mediaDownloadUrlInputSchema = z.object({
  mediaAssetId: uuidSchema,
});
export type MediaDownloadUrlInput = z.infer<
  typeof mediaDownloadUrlInputSchema
>;

export const mediaDownloadUrlSchema = z.object({
  mediaAssetId: uuidSchema,
  downloadUrl: z.string().url(),
  expiresAt: isoDateTimeSchema,
});
export type MediaDownloadUrl = z.infer<typeof mediaDownloadUrlSchema>;
