import {
  invitationKindSchema,
  joinRequestStatusSchema,
} from "@kichkintoy/shared";
import { z } from "zod";

const phoneNumberSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\+?[0-9\s()-]{9,18}$/, "Phone number is invalid.");

const uuidSchema = z.string().trim().uuid();

export const listJoinRequestsQuerySchema = z.object({
  status: joinRequestStatusSchema.optional(),
});

export const approveJoinRequestSchema = z.object({
  classId: uuidSchema.optional(),
});

export const rejectJoinRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const createInvitationSchema = z
  .object({
    kind: invitationKindSchema,
    phone: phoneNumberSchema,
    classId: uuidSchema.optional(),
    childNameHint: z.string().trim().max(120).optional(),
    expiresInDays: z.number().int().min(1).max(30).default(14),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "parent" && !value.classId) {
      ctx.addIssue({
        code: "custom",
        message: "Class is required for parent invitations.",
        path: ["classId"],
      });
    }
  });

export const updateTeacherSchema = z.object({
  canApproveMembers: z.boolean(),
});

export type ListJoinRequestsQuery = z.infer<
  typeof listJoinRequestsQuerySchema
>;
export type ApproveJoinRequestInput = z.infer<typeof approveJoinRequestSchema>;
export type RejectJoinRequestInput = z.infer<typeof rejectJoinRequestSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
