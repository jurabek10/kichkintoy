import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";
import { commentAttachmentSchema, commentAuthorDisplaySchema } from "./comment-author.js";

export const albumVisibilityValues = ["class", "tagged_children"] as const;
export const albumVisibilitySchema = z.enum(albumVisibilityValues);
export type AlbumVisibility = z.infer<typeof albumVisibilitySchema>;

export const albumStatusValues = ["draft", "published"] as const;
export const albumStatusSchema = z.enum(albumStatusValues);
export type AlbumStatus = z.infer<typeof albumStatusSchema>;

export const albumReactionKindValues = ["heart"] as const;
export const albumReactionKindSchema = z.enum(albumReactionKindValues);
export type AlbumReactionKind = z.infer<typeof albumReactionKindSchema>;

export const albumAuthorSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  photoMediaAssetId: uuidSchema.nullable(),
  photoUrl: z.string().nullable(),
});
export type AlbumAuthor = z.infer<typeof albumAuthorSchema>;

export const albumClassSchema = z.object({
  id: uuidSchema,
  name: z.string(),
});
export type AlbumClass = z.infer<typeof albumClassSchema>;

export const albumChildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
});
export type AlbumChild = z.infer<typeof albumChildSchema>;

export const albumMediaSchema = z.object({
  id: uuidSchema,
  assetId: uuidSchema,
  fileUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  mediaType: z.string(),
  mimeType: z.string().nullable(),
  position: z.number().int(),
});
export type AlbumMedia = z.infer<typeof albumMediaSchema>;

export const albumCommentSchema = z
  .object({
    id: uuidSchema,
    authorUserId: uuidSchema,
    authorName: z.string(),
    body: z.string(),
    deletedAt: isoDateTimeSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    attachments: z.array(commentAttachmentSchema),
  })
  .merge(commentAuthorDisplaySchema);
export type AlbumComment = z.infer<typeof albumCommentSchema>;

export const albumReactionSummarySchema = z.object({
  heartCount: z.number().int(),
  myReaction: albumReactionKindSchema.nullable(),
});
export type AlbumReactionSummary = z.infer<
  typeof albumReactionSummarySchema
>;

export const createAlbumPostInputSchema = z.object({
  centerId: uuidSchema,
  caption: z.string().trim().max(4000).default(""),
  visibility: albumVisibilitySchema,
  classIds: z.array(uuidSchema).min(1).max(10),
  childIds: z.array(uuidSchema).max(100).default([]),
  mediaAssetIds: z.array(uuidSchema).max(50).default([]),
  allowComments: z.boolean().default(true),
  publish: z.boolean().default(false),
});
export type CreateAlbumPostInput = z.infer<
  typeof createAlbumPostInputSchema
>;

export const updateAlbumPostBodySchema = createAlbumPostInputSchema
  .omit({ centerId: true, publish: true })
  .partial();
export type UpdateAlbumPostBody = z.infer<typeof updateAlbumPostBodySchema>;

export const albumPostSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  centerName: z.string(),
  author: albumAuthorSchema,
  caption: z.string(),
  bodyPreview: z.string(),
  visibility: albumVisibilitySchema,
  status: albumStatusSchema,
  allowComments: z.boolean(),
  classes: z.array(albumClassSchema),
  children: z.array(albumChildSchema),
  coverMedia: albumMediaSchema.nullable(),
  previewMedia: z.array(albumMediaSchema),
  mediaCount: z.number().int(),
  commentCount: z.number().int(),
  reactionSummary: albumReactionSummarySchema,
  publishedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
});
export type AlbumPostSummary = z.infer<typeof albumPostSummarySchema>;

export const albumPostDetailSchema = albumPostSummarySchema.extend({
  media: z.array(albumMediaSchema),
  comments: z.array(albumCommentSchema),
});
export type AlbumPostDetail = z.infer<typeof albumPostDetailSchema>;

export const albumAudienceResponseSchema = z.object({
  classes: z.array(albumClassSchema),
  children: z.array(albumChildSchema),
});
export type AlbumAudienceResponse = z.infer<
  typeof albumAudienceResponseSchema
>;

export const albumListResponseSchema = z.array(albumPostSummarySchema);
export type AlbumListResponse = z.infer<typeof albumListResponseSchema>;

export const addAlbumCommentInputSchema = z.object({
  body: z.string().trim().max(2000).optional(),
  attachmentMediaAssetIds: z.array(uuidSchema).max(4).default([]),
}).refine((input) => Boolean(input.body?.trim()) || input.attachmentMediaAssetIds.length > 0, {
  message: "A comment needs text or an attachment.",
});
export type AddAlbumCommentInput = z.infer<
  typeof addAlbumCommentInputSchema
>;
