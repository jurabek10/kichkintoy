import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pickupTimeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const pickupRelationshipValues = [
  "mother",
  "father",
  "grandparent",
  "other",
] as const;
export const pickupRelationshipSchema = z.enum(pickupRelationshipValues);
export type PickupRelationship = z.infer<typeof pickupRelationshipSchema>;

export const pickupNoticeStatusValues = [
  "submitted",
  "acknowledged",
  "changed",
  "cancelled",
] as const;
export const pickupNoticeStatusSchema = z.enum(pickupNoticeStatusValues);
export type PickupNoticeStatus = z.infer<typeof pickupNoticeStatusSchema>;

export const pickupChildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  centerId: uuidSchema,
  centerName: z.string(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
});
export type PickupChild = z.infer<typeof pickupChildSchema>;

export const pickupStaffSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
});
export type PickupStaff = z.infer<typeof pickupStaffSchema>;

export const pickupNoticeSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  centerName: z.string(),
  child: pickupChildSchema,
  parentUserId: uuidSchema,
  parentName: z.string(),
  pickupDate: isoDateSchema,
  pickupTime: pickupTimeSchema,
  pickupPersonName: z.string(),
  relationship: pickupRelationshipSchema,
  note: z.string().nullable(),
  status: pickupNoticeStatusSchema,
  acknowledgedBy: pickupStaffSchema.nullable(),
  acknowledgedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type PickupNoticeSummary = z.infer<typeof pickupNoticeSummarySchema>;

export const pickupNoticeDetailSchema = pickupNoticeSummarySchema;
export type PickupNoticeDetail = z.infer<typeof pickupNoticeDetailSchema>;

export const pickupAudienceResponseSchema = z.object({
  children: z.array(pickupChildSchema),
});
export type PickupAudienceResponse = z.infer<
  typeof pickupAudienceResponseSchema
>;

export const createPickupNoticeInputSchema = z.object({
  childId: uuidSchema,
  pickupDate: isoDateSchema,
  pickupTime: pickupTimeSchema,
  pickupPersonName: z.string().trim().min(1).max(100),
  relationship: pickupRelationshipSchema,
  note: z.string().trim().max(500).optional(),
});
export type CreatePickupNoticeInput = z.infer<
  typeof createPickupNoticeInputSchema
>;

export const updatePickupNoticeBodySchema = createPickupNoticeInputSchema
  .omit({ childId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one pickup field is required.",
  });
export type UpdatePickupNoticeBody = z.infer<
  typeof updatePickupNoticeBodySchema
>;

export const pickupNoticeListResponseSchema = z.array(
  pickupNoticeSummarySchema,
);
export type PickupNoticeListResponse = z.infer<
  typeof pickupNoticeListResponseSchema
>;
