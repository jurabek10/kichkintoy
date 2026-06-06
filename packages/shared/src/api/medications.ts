import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const medicationStatusValues = [
  "pending",
  "administered",
  "skipped",
  "cancelled",
] as const;
export const medicationStatusSchema = z.enum(medicationStatusValues);
export type MedicationStatus = z.infer<typeof medicationStatusSchema>;

export const medicationChildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  centerId: uuidSchema,
  centerName: z.string().nullable(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
});
export type MedicationChild = z.infer<typeof medicationChildSchema>;

export const medicationStaffSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
});
export type MedicationStaff = z.infer<typeof medicationStaffSchema>;

export const medicationMediaSchema = z.object({
  assetId: uuidSchema,
  mediaType: z.string(),
  mimeType: z.string().nullable(),
});
export type MedicationMedia = z.infer<typeof medicationMediaSchema>;

export const medicationRequestSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  centerName: z.string(),
  child: medicationChildSchema,
  parentUserId: uuidSchema,
  parentName: z.string(),
  requestedForDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  symptoms: z.string(),
  medicineName: z.string(),
  medicationType: z.string(),
  dosage: z.string(),
  medicationTime: z.string(),
  medicationCount: z.string().nullable(),
  status: medicationStatusSchema,
  photo: medicationMediaSchema.nullable(),
  reviewedAt: isoDateTimeSchema.nullable(),
  administeredAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type MedicationRequestSummary = z.infer<
  typeof medicationRequestSummarySchema
>;

export const medicationRequestDetailSchema =
  medicationRequestSummarySchema.extend({
    instructions: z.string().nullable(),
    storageMethod: z.string().nullable(),
    specialNote: z.string().nullable(),
    photoCaption: z.string().nullable(),
    parentSignature: z.string(),
    reviewedBy: medicationStaffSchema.nullable(),
    administeredBy: medicationStaffSchema.nullable(),
    administeredDose: z.string().nullable(),
    staffNote: z.string().nullable(),
    skippedReason: z.string().nullable(),
  });
export type MedicationRequestDetail = z.infer<
  typeof medicationRequestDetailSchema
>;

export const medicationAudienceResponseSchema = z.object({
  children: z.array(medicationChildSchema),
});
export type MedicationAudienceResponse = z.infer<
  typeof medicationAudienceResponseSchema
>;

export const createMedicationRequestInputSchema = z.object({
  childId: uuidSchema,
  requestedForDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  symptoms: z.string().trim().min(1).max(2000),
  medicineName: z.string().trim().min(1).max(200),
  medicationType: z.string().trim().min(1).max(200),
  dosage: z.string().trim().min(1).max(200),
  medicationTime: z.string().trim().min(1).max(200),
  medicationCount: z.string().trim().max(100).optional(),
  storageMethod: z.string().trim().max(200).optional(),
  instructions: z.string().trim().max(2000).optional(),
  specialNote: z.string().trim().max(2000).optional(),
  photoMediaAssetId: uuidSchema.optional(),
  photoCaption: z.string().trim().max(50).optional(),
  parentSignature: z.string().trim().min(1).max(200),
  consent: z.literal(true),
});
export type CreateMedicationRequestInput = z.infer<
  typeof createMedicationRequestInputSchema
>;

export const completeMedicationRequestInputSchema = z
  .object({
    status: z.enum(["administered", "skipped"]),
    administeredAt: isoDateTimeSchema.optional(),
    administeredDose: z.string().trim().max(200).optional(),
    staffNote: z.string().trim().max(2000).optional(),
    skippedReason: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "skipped" && !value.skippedReason?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Skipped reason is required.",
        path: ["skippedReason"],
      });
    }
  });
export type CompleteMedicationRequestInput = z.infer<
  typeof completeMedicationRequestInputSchema
>;

export const medicationListResponseSchema = z.array(
  medicationRequestSummarySchema,
);
export type MedicationListResponse = z.infer<
  typeof medicationListResponseSchema
>;
