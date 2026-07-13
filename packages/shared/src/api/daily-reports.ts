import { z } from "zod";
import { childGenderSchema } from "../child/gender.js";
import { isoDateSchema, isoDateTimeSchema, uuidSchema } from "../lib/validators.js";
import { commentAttachmentSchema, commentAuthorDisplaySchema } from "./comment-author.js";

export const dailyReportStatusValues = [
  "draft",
  "scheduled",
  "published",
] as const;
export const dailyReportStatusSchema = z.enum(dailyReportStatusValues);
export type DailyReportStatus = z.infer<typeof dailyReportStatusSchema>;

export const dailyReportItemTypeValues = [
  "meal",
  "sleep",
  "toilet",
  "mood",
  "activity",
  "temperature",
  "medication",
  "health",
  "class_participation",
  "custom",
] as const;
export const dailyReportItemTypeSchema = z.enum(dailyReportItemTypeValues);
export type DailyReportItemType = z.infer<typeof dailyReportItemTypeSchema>;

export const classParticipationLevelValues = [
  "excellent",
  "good",
  "needs_support",
  "not_observed",
  "absent",
] as const;
export const classParticipationLevelSchema = z.enum(
  classParticipationLevelValues,
);
export type ClassParticipationLevel = z.infer<
  typeof classParticipationLevelSchema
>;

export const classParticipationInterestValues = [
  "high",
  "medium",
  "low",
  "not_observed",
] as const;
export const classParticipationInterestSchema = z.enum(
  classParticipationInterestValues,
);
export type ClassParticipationInterest = z.infer<
  typeof classParticipationInterestSchema
>;

export const classParticipationNoteSchema = z.object({
  interest: classParticipationInterestSchema,
  strengths: z.string().trim().max(500).nullable().optional(),
  needsPractice: z.string().trim().max(500).nullable().optional(),
  homeSuggestion: z.string().trim().max(500).nullable().optional(),
  teacherNote: z.string().trim().max(1000).nullable().optional(),
});
export type ClassParticipationNote = z.infer<
  typeof classParticipationNoteSchema
>;

export const classParticipationItemInputSchema = z.object({
  itemType: z.literal("class_participation"),
  title: z.string().trim().min(1).max(80),
  value: classParticipationLevelSchema,
  note: z.string().trim().min(1).max(1600),
  recordedAt: isoDateTimeSchema.nullable().optional(),
});
export type ClassParticipationItemInput = z.infer<
  typeof classParticipationItemInputSchema
>;

export const dailyReportItemInputSchema = z.object({
  itemType: dailyReportItemTypeSchema,
  title: z.string().trim().max(80).nullable().optional(),
  value: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(1600).nullable().optional(),
  recordedAt: isoDateTimeSchema.nullable().optional(),
});
export type DailyReportItemInput = z.infer<
  typeof dailyReportItemInputSchema
>;

export const dailyReportItemSchema = dailyReportItemInputSchema.extend({
  id: uuidSchema,
  title: z.string().nullable(),
  value: z.string().nullable(),
  note: z.string().nullable(),
  recordedAt: isoDateTimeSchema.nullable(),
});
export type DailyReportItem = z.infer<typeof dailyReportItemSchema>;

export const createDailyReportRequestSchema = z.object({
  childId: uuidSchema,
  reportDate: isoDateSchema,
  mood: z.string().trim().max(80).nullable().optional(),
  healthNote: z.string().trim().max(1000).nullable().optional(),
  teacherNote: z.string().trim().max(3000).nullable().optional(),
  items: z.array(dailyReportItemInputSchema).default([]),
  photoAssetIds: z.array(uuidSchema).default([]),
  publish: z.boolean().optional(),
  scheduledAt: isoDateTimeSchema.optional(),
});
export type CreateDailyReportRequest = z.infer<
  typeof createDailyReportRequestSchema
>;

export const updateDailyReportRequestSchema = z.object({
  reportDate: isoDateSchema.optional(),
  mood: z.string().trim().max(80).nullable().optional(),
  healthNote: z.string().trim().max(1000).nullable().optional(),
  teacherNote: z.string().trim().max(3000).nullable().optional(),
  items: z.array(dailyReportItemInputSchema).optional(),
  photoAssetIds: z.array(uuidSchema).optional(),
});
export type UpdateDailyReportRequest = z.infer<
  typeof updateDailyReportRequestSchema
>;

export const publishDailyReportRequestSchema = z.object({
  scheduledAt: isoDateTimeSchema.optional(),
});
export type PublishDailyReportRequest = z.infer<
  typeof publishDailyReportRequestSchema
>;

export const bulkDailyReportRequestSchema = z.object({
  reportDate: isoDateSchema,
});
export type BulkDailyReportRequest = z.infer<
  typeof bulkDailyReportRequestSchema
>;

export const dailyReportCommentRequestSchema = z.object({
  body: z.string().trim().max(2000).optional(),
  attachmentMediaAssetIds: z.array(uuidSchema).max(4).default([]),
  parentCommentId: uuidSchema.optional(),
  // Client-generated id so an offline comment replayed on reconnect is applied
  // at most once (see the server idempotency guard).
  idempotencyKey: uuidSchema.optional(),
}).refine((input) => Boolean(input.body?.trim()) || input.attachmentMediaAssetIds.length > 0, {
  message: "A comment needs text or an attachment.",
});
export type DailyReportCommentRequest = z.infer<
  typeof dailyReportCommentRequestSchema
>;

export const dailyReportChildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  photoUrl: z.string().nullable(),
  dateOfBirth: isoDateSchema.nullable(),
  gender: childGenderSchema.nullable(),
});
export type DailyReportChild = z.infer<typeof dailyReportChildSchema>;

export const dailyReportClassSchema = z.object({
  id: uuidSchema,
  name: z.string(),
});
export type DailyReportClass = z.infer<typeof dailyReportClassSchema>;

export const dailyReportAuthorSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  photoMediaAssetId: uuidSchema.nullable(),
  photoUrl: z.string().nullable(),
});
export type DailyReportAuthor = z.infer<typeof dailyReportAuthorSchema>;

export const dailyReportMediaSchema = z.object({
  id: uuidSchema,
  fileUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  mediaType: z.string(),
});
export type DailyReportMedia = z.infer<typeof dailyReportMediaSchema>;

export const dailyReportReadSchema = z.object({
  id: uuidSchema,
  guardianUserId: uuidSchema,
  guardianName: z.string(),
  readAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type DailyReportRead = z.infer<typeof dailyReportReadSchema>;

export const dailyReportCommentSchema = z
  .object({
    id: uuidSchema,
    authorUserId: uuidSchema,
    authorName: z.string(),
    parentCommentId: uuidSchema.nullable(),
    body: z.string(),
    deletedAt: isoDateTimeSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    attachments: z.array(commentAttachmentSchema),
  })
  .merge(commentAuthorDisplaySchema);
export type DailyReportComment = z.infer<typeof dailyReportCommentSchema>;

export const dailyReportSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  child: dailyReportChildSchema,
  class: dailyReportClassSchema,
  author: dailyReportAuthorSchema,
  reportDate: isoDateSchema,
  status: dailyReportStatusSchema,
  mood: z.string().nullable(),
  teacherNote: z.string().nullable(),
  publishedAt: isoDateTimeSchema.nullable(),
  scheduledAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
  itemCount: z.number().int(),
  photoCount: z.number().int(),
  commentCount: z.number().int(),
  readCount: z.number().int(),
  guardianCount: z.number().int(),
});
export type DailyReportSummary = z.infer<typeof dailyReportSummarySchema>;

export const dailyReportDetailSchema = dailyReportSummarySchema.extend({
  healthNote: z.string().nullable(),
  items: z.array(dailyReportItemSchema),
  photos: z.array(dailyReportMediaSchema),
  reads: z.array(dailyReportReadSchema),
  comments: z.array(dailyReportCommentSchema),
});
export type DailyReportDetail = z.infer<typeof dailyReportDetailSchema>;

export const dailyReportClassChildStatusSchema = dailyReportChildSchema.extend({
  centerId: uuidSchema,
  class: dailyReportClassSchema,
  report: dailyReportSummarySchema.nullable(),
});
export type DailyReportClassChildStatus = z.infer<
  typeof dailyReportClassChildStatusSchema
>;

export const parentChildSummarySchema = dailyReportChildSchema.extend({
  centerId: uuidSchema,
  centerName: z.string(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
});
export type ParentChildSummary = z.infer<typeof parentChildSummarySchema>;

export const dailyReportListResponseSchema = z.array(dailyReportSummarySchema);
export type DailyReportListResponse = z.infer<
  typeof dailyReportListResponseSchema
>;

export const generateReportNoteInputSchema = z.object({
  language: z.enum(["uz", "ru"]),
  mood: z.string().trim().max(80).optional(),
  items: z
    .array(
      z.object({
        itemType: dailyReportItemTypeSchema,
        title: z.string().trim().max(80).optional(),
        value: z.string().trim().max(120).optional(),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .optional(),
  classParticipation: z
    .array(
      z.object({
        subject: z.string().trim().max(80),
        level: classParticipationLevelSchema,
        interest: classParticipationInterestSchema.optional(),
        strengths: z.string().trim().max(300).optional(),
        needsPractice: z.string().trim().max(300).optional(),
      }),
    )
    .optional(),
});
export type GenerateReportNoteInput = z.infer<
  typeof generateReportNoteInputSchema
>;
