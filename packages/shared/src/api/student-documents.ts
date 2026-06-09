import { z } from "zod";
import { isoDateSchema, isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const studentDocumentTemplateTypeValues = [
  "admission",
  "medical_allergy",
  "emergency_contact",
  "consent",
  "file_upload",
  "custom",
] as const;
export const studentDocumentTemplateTypeSchema = z.enum(
  studentDocumentTemplateTypeValues,
);
export type StudentDocumentTemplateType = z.infer<
  typeof studentDocumentTemplateTypeSchema
>;

export const studentDocumentTemplateStatusValues = [
  "draft",
  "active",
  "archived",
] as const;
export const studentDocumentTemplateStatusSchema = z.enum(
  studentDocumentTemplateStatusValues,
);
export type StudentDocumentTemplateStatus = z.infer<
  typeof studentDocumentTemplateStatusSchema
>;

export const studentDocumentRequestStatusValues = [
  "draft",
  "sent",
  "closed",
  "archived",
] as const;
export const studentDocumentRequestStatusSchema = z.enum(
  studentDocumentRequestStatusValues,
);
export type StudentDocumentRequestStatus = z.infer<
  typeof studentDocumentRequestStatusSchema
>;

export const studentDocumentSubmissionStatusValues = [
  "not_started",
  "in_progress",
  "submitted",
  "needs_correction",
  "accepted",
  "closed",
] as const;
export const studentDocumentSubmissionStatusSchema = z.enum(
  studentDocumentSubmissionStatusValues,
);
export type StudentDocumentSubmissionStatus = z.infer<
  typeof studentDocumentSubmissionStatusSchema
>;

export const studentDocumentTargetTypeValues = ["center", "class", "child"] as const;
export const studentDocumentTargetTypeSchema = z.enum(
  studentDocumentTargetTypeValues,
);
export type StudentDocumentTargetType = z.infer<
  typeof studentDocumentTargetTypeSchema
>;

export const studentDocumentFieldTypeValues = [
  "short_text",
  "long_text",
  "phone",
  "date",
  "single_choice",
  "multi_choice",
  "checkbox",
  "signature",
  "file",
] as const;
export const studentDocumentFieldTypeSchema = z.enum(
  studentDocumentFieldTypeValues,
);
export type StudentDocumentFieldType = z.infer<
  typeof studentDocumentFieldTypeSchema
>;

export const studentDocumentFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-zA-Z0-9_-]+$/),
    label: z.string().trim().min(1).max(120),
    type: studentDocumentFieldTypeSchema,
    required: z.boolean().default(false),
    helpText: z.string().trim().max(240).optional(),
    options: z
      .array(
        z.object({
          value: z.string().trim().min(1).max(80),
          label: z.string().trim().min(1).max(120),
        }),
      )
      .max(20)
      .optional(),
    maxFiles: z.number().int().min(1).max(5).optional(),
  })
  .superRefine((field, ctx) => {
    if (
      (field.type === "single_choice" || field.type === "multi_choice") &&
      !field.options?.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Choice fields require options.",
      });
    }
    if (field.type === "file" && field.maxFiles === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["maxFiles"],
        message: "File fields require maxFiles.",
      });
    }
  });
export type StudentDocumentField = z.infer<typeof studentDocumentFieldSchema>;

export const studentDocumentFieldsSchema = z
  .array(studentDocumentFieldSchema)
  .min(1)
  .max(40)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    for (const [index, field] of fields.entries()) {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "key"],
          message: "Field keys must be unique.",
        });
      }
      seen.add(field.key);
    }
  });

export const studentDocumentAnswerValueSchema = z.union([
  z.string().max(5000),
  z.boolean(),
  z.array(z.string().max(240)).max(20),
  z.array(uuidSchema).max(10),
  z.null(),
]);
export type StudentDocumentAnswerValue = z.infer<
  typeof studentDocumentAnswerValueSchema
>;

export const studentDocumentAnswersSchema = z.record(
  z.string().min(1),
  studentDocumentAnswerValueSchema,
);
export type StudentDocumentAnswers = z.infer<typeof studentDocumentAnswersSchema>;

export const studentDocumentAttachmentSchema = z.object({
  id: uuidSchema,
  submissionId: uuidSchema,
  mediaAssetId: uuidSchema,
  fieldKey: z.string(),
  originalFilename: z.string().nullable(),
  position: z.number().int().min(0),
  mediaType: z.string(),
  mimeType: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type StudentDocumentAttachment = z.infer<
  typeof studentDocumentAttachmentSchema
>;

export const studentDocumentTemplateSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  templateType: studentDocumentTemplateTypeSchema,
  status: studentDocumentTemplateStatusSchema,
  fields: studentDocumentFieldsSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  archivedAt: isoDateTimeSchema.nullable(),
});
export type StudentDocumentTemplateSummary = z.infer<
  typeof studentDocumentTemplateSummarySchema
>;

export const studentDocumentRequestSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  templateId: uuidSchema,
  title: z.string(),
  instructions: z.string().nullable(),
  targetType: studentDocumentTargetTypeSchema,
  classIds: z.array(uuidSchema),
  classNames: z.array(z.string()),
  childIds: z.array(uuidSchema),
  childNames: z.array(z.string()),
  dueDate: isoDateSchema.nullable(),
  status: studentDocumentRequestStatusSchema,
  sentAt: isoDateTimeSchema.nullable(),
  closedAt: isoDateTimeSchema.nullable(),
  totalSubmissions: z.number().int().min(0),
  submittedCount: z.number().int().min(0),
  acceptedCount: z.number().int().min(0),
  needsCorrectionCount: z.number().int().min(0),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type StudentDocumentRequestSummary = z.infer<
  typeof studentDocumentRequestSummarySchema
>;

export const studentDocumentSubmissionSummarySchema = z.object({
  id: uuidSchema,
  requestId: uuidSchema,
  centerId: uuidSchema,
  childId: uuidSchema,
  childName: z.string(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
  requestTitle: z.string(),
  templateType: studentDocumentTemplateTypeSchema,
  dueDate: isoDateSchema.nullable(),
  status: studentDocumentSubmissionStatusSchema,
  correctionNote: z.string().nullable(),
  submittedAt: isoDateTimeSchema.nullable(),
  reviewedAt: isoDateTimeSchema.nullable(),
  attachmentCount: z.number().int().min(0),
  updatedAt: isoDateTimeSchema,
});
export type StudentDocumentSubmissionSummary = z.infer<
  typeof studentDocumentSubmissionSummarySchema
>;

export const studentDocumentSubmissionDetailSchema =
  studentDocumentSubmissionSummarySchema.extend({
    templateId: uuidSchema,
    instructions: z.string().nullable(),
    fields: studentDocumentFieldsSchema,
    answers: studentDocumentAnswersSchema,
    attachments: z.array(studentDocumentAttachmentSchema),
    submittedByName: z.string().nullable(),
    reviewedByName: z.string().nullable(),
  });
export type StudentDocumentSubmissionDetail = z.infer<
  typeof studentDocumentSubmissionDetailSchema
>;

export const studentDocumentSafetySummarySchema = z.object({
  childId: uuidSchema,
  childName: z.string(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
  allergies: z.string().nullable(),
  medicalNotes: z.string().nullable(),
  emergencyContacts: z.array(z.string()),
  lastUpdatedAt: isoDateTimeSchema.nullable(),
});
export type StudentDocumentSafetySummary = z.infer<
  typeof studentDocumentSafetySummarySchema
>;

export const createStudentDocumentTemplateInputSchema = z.object({
  centerId: uuidSchema,
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000).optional(),
  templateType: studentDocumentTemplateTypeSchema,
  status: studentDocumentTemplateStatusSchema.optional(),
  fields: studentDocumentFieldsSchema,
});
export type CreateStudentDocumentTemplateInput = z.infer<
  typeof createStudentDocumentTemplateInputSchema
>;

export const updateStudentDocumentTemplateInputSchema = z.object({
  templateId: uuidSchema,
  body: z
    .object({
      title: z.string().trim().min(1).max(140).optional(),
      description: z.string().trim().max(1000).nullable().optional(),
      templateType: studentDocumentTemplateTypeSchema.optional(),
      status: studentDocumentTemplateStatusSchema.optional(),
      fields: studentDocumentFieldsSchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one template field is required.",
    }),
});
export type UpdateStudentDocumentTemplateInput = z.infer<
  typeof updateStudentDocumentTemplateInputSchema
>;

export const studentDocumentTemplateIdInputSchema = z.object({
  templateId: uuidSchema,
});

export const studentDocumentStaffTemplatesInputSchema = z.object({
  centerId: uuidSchema,
  status: studentDocumentTemplateStatusSchema.optional(),
});

export const sendStudentDocumentRequestInputSchema = z
  .object({
    centerId: uuidSchema,
    templateId: uuidSchema,
    targetType: studentDocumentTargetTypeSchema,
    classIds: z.array(uuidSchema).optional(),
    childIds: z.array(uuidSchema).optional(),
    title: z.string().trim().min(1).max(140),
    instructions: z.string().trim().max(1500).optional(),
    dueDate: isoDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.targetType === "class" && !value.classIds?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["classIds"],
        message: "Choose at least one class.",
      });
    }
    if (value.targetType === "child" && !value.childIds?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["childIds"],
        message: "Choose at least one child.",
      });
    }
  });
export type SendStudentDocumentRequestInput = z.infer<
  typeof sendStudentDocumentRequestInputSchema
>;

export const studentDocumentRequestIdInputSchema = z.object({
  requestId: uuidSchema,
});

export const studentDocumentStaffRequestsInputSchema = z.object({
  centerId: uuidSchema,
  status: studentDocumentRequestStatusSchema.optional(),
});

export const studentDocumentStaffSubmissionsInputSchema = z.object({
  centerId: uuidSchema,
  requestId: uuidSchema.optional(),
  classId: uuidSchema.optional(),
  status: studentDocumentSubmissionStatusSchema.optional(),
});

export const studentDocumentSubmissionIdInputSchema = z.object({
  submissionId: uuidSchema,
});

export const parentStudentDocumentRequestsInputSchema = z
  .object({
    childId: uuidSchema.optional(),
    status: studentDocumentSubmissionStatusSchema.optional(),
  })
  .optional();

export const parentSaveStudentDocumentDraftInputSchema = z.object({
  submissionId: uuidSchema,
  answers: studentDocumentAnswersSchema,
  attachmentMediaAssetIds: z.array(uuidSchema).max(20).optional(),
});
export type ParentSaveStudentDocumentDraftInput = z.infer<
  typeof parentSaveStudentDocumentDraftInputSchema
>;

export const parentSubmitStudentDocumentInputSchema =
  parentSaveStudentDocumentDraftInputSchema;
export type ParentSubmitStudentDocumentInput = z.infer<
  typeof parentSubmitStudentDocumentInputSchema
>;

export const reviewStudentDocumentSubmissionInputSchema = z.object({
  submissionId: uuidSchema,
  decision: z.enum(["accepted", "needs_correction"]),
  correctionNote: z.string().trim().max(1000).optional(),
});
export type ReviewStudentDocumentSubmissionInput = z.infer<
  typeof reviewStudentDocumentSubmissionInputSchema
>;

export const childSafetySummaryInputSchema = z.object({
  childId: uuidSchema,
});

export const studentDocumentTemplateListSchema = z.array(
  studentDocumentTemplateSummarySchema,
);
export const studentDocumentRequestListSchema = z.array(
  studentDocumentRequestSummarySchema,
);
export const studentDocumentSubmissionListSchema = z.array(
  studentDocumentSubmissionSummarySchema,
);
