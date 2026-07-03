import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";
import { commentAuthorDisplaySchema } from "./comment-author.js";

export const noticeStatusValues = ["draft", "scheduled", "published"] as const;
export const noticeStatusSchema = z.enum(noticeStatusValues);
export type NoticeStatus = z.infer<typeof noticeStatusSchema>;

export const noticeTargetTypeValues = ["center", "class", "child"] as const;
export const noticeTargetTypeSchema = z.enum(noticeTargetTypeValues);
export type NoticeTargetType = z.infer<typeof noticeTargetTypeSchema>;

export const noticeTargetKindValues = ["class", "child"] as const;
export const noticeTargetKindSchema = z.enum(noticeTargetKindValues);
export type NoticeTargetKind = z.infer<typeof noticeTargetKindSchema>;

export const noticeKindValues = ["announcement", "survey"] as const;
export const noticeKindSchema = z.enum(noticeKindValues);
export type NoticeKind = z.infer<typeof noticeKindSchema>;

export const noticeTargetSchema = z.object({
  kind: noticeTargetKindSchema,
  id: uuidSchema,
  label: z.string(),
});
export type NoticeTarget = z.infer<typeof noticeTargetSchema>;

export const noticeAuthorSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  photoMediaAssetId: uuidSchema.nullable(),
  photoUrl: z.string().nullable(),
});
export type NoticeAuthor = z.infer<typeof noticeAuthorSchema>;

export const noticeCommentSchema = z
  .object({
    id: uuidSchema,
    authorUserId: uuidSchema,
    authorName: z.string(),
    body: z.string(),
    deletedAt: isoDateTimeSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .merge(commentAuthorDisplaySchema);
export type NoticeComment = z.infer<typeof noticeCommentSchema>;

export const addNoticeCommentInputSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type AddNoticeCommentInput = z.infer<typeof addNoticeCommentInputSchema>;

export const noticeClassSchema = z.object({
  id: uuidSchema,
  name: z.string(),
});
export type NoticeClass = z.infer<typeof noticeClassSchema>;

export const noticeChildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
});
export type NoticeChild = z.infer<typeof noticeChildSchema>;

export const createNoticeRequestSchema = z.object({
  centerId: uuidSchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(6000),
  targetType: noticeTargetTypeSchema,
  targetIds: z.array(uuidSchema).default([]),
  requiresConfirmation: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  isPinned: z.boolean().default(false),
  isImportant: z.boolean().default(false),
  publish: z.boolean().default(false),
  scheduledAt: isoDateTimeSchema.optional(),
});
export type CreateNoticeRequest = z.infer<typeof createNoticeRequestSchema>;

export const updateNoticeRequestSchema = createNoticeRequestSchema
  .omit({ centerId: true, publish: true })
  .partial()
  .extend({
    targetIds: z.array(uuidSchema).optional(),
  });
export type UpdateNoticeRequest = z.infer<typeof updateNoticeRequestSchema>;

export const publishNoticeRequestSchema = z.object({
  scheduledAt: isoDateTimeSchema.optional(),
});
export type PublishNoticeRequest = z.infer<typeof publishNoticeRequestSchema>;

export const noticeReadSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  childId: uuidSchema.nullable(),
  childName: z.string().nullable(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
  readAt: isoDateTimeSchema.nullable(),
  confirmedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type NoticeRead = z.infer<typeof noticeReadSchema>;

export const noticeSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  centerName: z.string(),
  author: noticeAuthorSchema,
  title: z.string(),
  bodyPreview: z.string(),
  kind: noticeKindSchema,
  targetType: noticeTargetTypeSchema,
  targets: z.array(noticeTargetSchema),
  status: noticeStatusSchema,
  requiresConfirmation: z.boolean(),
  allowComments: z.boolean(),
  isPinned: z.boolean(),
  isImportant: z.boolean(),
  publishedAt: isoDateTimeSchema.nullable(),
  scheduledAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  recipientCount: z.number().int(),
  readCount: z.number().int(),
  confirmedCount: z.number().int(),
  commentCount: z.number().int(),
  myReadAt: isoDateTimeSchema.nullable().optional(),
  myConfirmedAt: isoDateTimeSchema.nullable().optional(),
  child: noticeChildSchema.nullable().optional(),
});
export type NoticeSummary = z.infer<typeof noticeSummarySchema>;

export const noticeDetailSchema = noticeSummarySchema.extend({
  body: z.string(),
  recipients: z.array(noticeReadSchema),
  comments: z.array(noticeCommentSchema),
});
export type NoticeDetail = z.infer<typeof noticeDetailSchema>;

export const noticeRecipientActionResponseSchema = z.object({
  id: uuidSchema,
  readAt: isoDateTimeSchema.nullable(),
  confirmedAt: isoDateTimeSchema.nullable(),
});
export type NoticeRecipientActionResponse = z.infer<
  typeof noticeRecipientActionResponseSchema
>;

export const noticeAudienceResponseSchema = z.object({
  classes: z.array(noticeClassSchema),
  children: z.array(noticeChildSchema),
});
export type NoticeAudienceResponse = z.infer<
  typeof noticeAudienceResponseSchema
>;

export const noticeListResponseSchema = z.array(noticeSummarySchema);
export type NoticeListResponse = z.infer<typeof noticeListResponseSchema>;
