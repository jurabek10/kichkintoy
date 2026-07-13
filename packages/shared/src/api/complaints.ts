import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const complaintCategoryValues = [
  "meals", "safety", "staff_behavior", "fees", "facility", "health", "curriculum", "other",
] as const;
export const complaintCategorySchema = z.enum(complaintCategoryValues);
export type ComplaintCategory = z.infer<typeof complaintCategorySchema>;

export const complaintStatusValues = ["open", "in_progress", "resolved", "withdrawn"] as const;
export const complaintStatusSchema = z.enum(complaintStatusValues);
export type ComplaintStatus = z.infer<typeof complaintStatusSchema>;

export const complaintVisibilityValues = ["teacher_and_director", "director_only"] as const;
export const complaintVisibilitySchema = z.enum(complaintVisibilityValues);
export type ComplaintVisibility = z.infer<typeof complaintVisibilitySchema>;

export const createComplaintInputSchema = z.object({
  childId: uuidSchema,
  category: complaintCategorySchema,
  subject: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  visibility: complaintVisibilitySchema.default("teacher_and_director"),
});
export type CreateComplaintInput = z.infer<typeof createComplaintInputSchema>;

export const complaintPersonSchema = z.object({
  userId: uuidSchema,
  displayName: z.string().min(1),
  photoMediaAssetId: uuidSchema.nullable(),
  photoUrl: z.string().nullable(),
});

export const complaintChildSchema = z.object({
  id: uuidSchema,
  displayName: z.string().min(1),
  photoMediaAssetId: uuidSchema.nullable(),
  photoUrl: z.string().nullable(),
});

export const complaintSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  classId: uuidSchema.nullable(),
  classLabel: z.string().nullable(),
  child: complaintChildSchema,
  category: complaintCategorySchema,
  subject: z.string().min(1).max(120),
  status: complaintStatusSchema,
  visibility: complaintVisibilitySchema,
  createdAt: isoDateTimeSchema,
  lastActivityAt: isoDateTimeSchema,
});
export type ComplaintSummary = z.infer<typeof complaintSummarySchema>;

export const complaintReplySchema = z.object({
  id: uuidSchema,
  complaintId: uuidSchema,
  sender: complaintPersonSchema,
  body: z.string().min(1).max(4000),
  createdAt: isoDateTimeSchema,
});
export type ComplaintReply = z.infer<typeof complaintReplySchema>;

export const complaintStatusEventSchema = z.object({
  id: uuidSchema,
  complaintId: uuidSchema,
  actor: complaintPersonSchema,
  fromStatus: complaintStatusSchema,
  toStatus: complaintStatusSchema,
  note: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type ComplaintStatusEvent = z.infer<typeof complaintStatusEventSchema>;

export const complaintDetailSchema = complaintSummarySchema.extend({
  body: z.string().min(1).max(4000),
  parent: complaintPersonSchema,
  resolutionNote: z.string().nullable(),
  resolvedAt: isoDateTimeSchema.nullable(),
  replies: z.array(complaintReplySchema),
  statusEvents: z.array(complaintStatusEventSchema),
});
export type ComplaintDetail = z.infer<typeof complaintDetailSchema>;

export const complaintListResponseSchema = z.object({
  items: z.array(complaintSummarySchema),
  nextCursor: uuidSchema.nullable(),
});
export type ComplaintListResponse = z.infer<typeof complaintListResponseSchema>;

export const complaintReplyInputSchema = z.object({
  complaintId: uuidSchema,
  body: z.string().trim().min(1).max(4000),
});

export const complaintSetStatusInputSchema = z
  .object({
    complaintId: uuidSchema,
    status: z.enum(["in_progress", "resolved"]),
    resolutionNote: z.string().trim().min(1).max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "resolved" && !value.resolutionNote) {
      ctx.addIssue({ code: "custom", path: ["resolutionNote"], message: "A resolution note is required." });
    }
  });

export const complaintOpenCountSchema = z.object({ total: z.number().int().min(0) });
