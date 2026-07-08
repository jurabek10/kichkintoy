import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const mealTypeValues = ["breakfast", "lunch", "snack", "dinner"] as const;
export const mealTypeSchema = z.enum(mealTypeValues);
export type MealType = z.infer<typeof mealTypeSchema>;

export const mealAudienceTypeValues = ["center", "class"] as const;
export const mealAudienceTypeSchema = z.enum(mealAudienceTypeValues);
export type MealAudienceType = z.infer<typeof mealAudienceTypeSchema>;

export const mealStatusValues = ["draft", "published"] as const;
export const mealStatusSchema = z.enum(mealStatusValues);
export type MealStatus = z.infer<typeof mealStatusSchema>;

export const mealEatingStatusValues = [
  "ate_all",
  "ate_most",
  "ate_some",
  "did_not_eat",
] as const;
export const mealEatingStatusSchema = z.enum(mealEatingStatusValues);
export type MealEatingStatus = z.infer<typeof mealEatingStatusSchema>;

export const mealAuthorSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
});
export type MealAuthor = z.infer<typeof mealAuthorSchema>;

export const mealClassSchema = z.object({
  id: uuidSchema,
  name: z.string(),
});
export type MealClass = z.infer<typeof mealClassSchema>;

export const mealChildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  // A media-asset id or legacy URL for the child's photo (resolved client-side).
  photoUrl: z.string().nullable(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
});
export type MealChild = z.infer<typeof mealChildSchema>;

export const mealMediaSchema = z.object({
  id: uuidSchema,
  assetId: uuidSchema,
  fileUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  mediaType: z.string(),
  mimeType: z.string().nullable(),
  position: z.number().int(),
});
export type MealMedia = z.infer<typeof mealMediaSchema>;

export const mealChildStatusSchema = z.object({
  id: uuidSchema,
  child: mealChildSchema,
  status: mealEatingStatusSchema,
  note: z.string().nullable(),
  recordedByUserId: uuidSchema,
  recordedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type MealChildStatus = z.infer<typeof mealChildStatusSchema>;

export const mealChildStatusInputSchema = z.object({
  childId: uuidSchema,
  status: mealEatingStatusSchema,
  note: z.string().trim().max(1000).optional(),
});
export type MealChildStatusInput = z.infer<
  typeof mealChildStatusInputSchema
>;

export const createMealPostInputSchema = z.object({
  centerId: uuidSchema,
  mealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: mealTypeSchema,
  audienceType: mealAudienceTypeSchema,
  classIds: z.array(uuidSchema).max(20).default([]),
  menuText: z.string().trim().min(1).max(4000),
  allergyNote: z.string().trim().max(2000).optional(),
  mediaAssetIds: z.array(uuidSchema).max(10).default([]),
  childStatuses: z.array(mealChildStatusInputSchema).max(200).default([]),
  publish: z.boolean().default(false),
});
export type CreateMealPostInput = z.infer<typeof createMealPostInputSchema>;

export const updateMealPostBodySchema = createMealPostInputSchema
  .omit({ centerId: true, publish: true })
  .partial();
export type UpdateMealPostBody = z.infer<typeof updateMealPostBodySchema>;

export const mealPostSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  centerName: z.string(),
  author: mealAuthorSchema,
  mealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: mealTypeSchema,
  audienceType: mealAudienceTypeSchema,
  classes: z.array(mealClassSchema),
  menuText: z.string(),
  allergyNote: z.string().nullable(),
  status: mealStatusSchema,
  coverMedia: mealMediaSchema.nullable(),
  mediaCount: z.number().int(),
  childStatusCount: z.number().int(),
  myChildStatuses: z.array(mealChildStatusSchema).optional(),
  publishedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
});
export type MealPostSummary = z.infer<typeof mealPostSummarySchema>;

export const mealPostDetailSchema = mealPostSummarySchema.extend({
  media: z.array(mealMediaSchema),
  childStatuses: z.array(mealChildStatusSchema),
});
export type MealPostDetail = z.infer<typeof mealPostDetailSchema>;

export const mealAudienceResponseSchema = z.object({
  classes: z.array(mealClassSchema),
  children: z.array(mealChildSchema),
});
export type MealAudienceResponse = z.infer<typeof mealAudienceResponseSchema>;

export const mealListResponseSchema = z.array(mealPostSummarySchema);
export type MealListResponse = z.infer<typeof mealListResponseSchema>;

export const setMealChildStatusesBodySchema = z.object({
  statuses: z.array(mealChildStatusInputSchema).max(200),
});
export type SetMealChildStatusesBody = z.infer<
  typeof setMealChildStatusesBodySchema
>;
