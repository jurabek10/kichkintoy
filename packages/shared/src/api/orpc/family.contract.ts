import { oc } from "@orpc/contract";
import { z } from "zod";
import { emptyInputSchema, successResponseSchema } from "./common.contract.js";

export const familyRelationshipSchema = z.enum([
  "father", "mother", "grandfather", "grandmother", "other",
]);

const guardianSchema = z.object({
  userId: z.string().uuid(), fullName: z.string(), avatarUrl: z.string().nullable(),
  telegramUsername: z.string().nullable(), relationship: z.string(), isPrimary: z.boolean(),
});
const invitationSchema = z.object({
  id: z.string().uuid(), relationship: familyRelationshipSchema, code: z.string().length(6),
  expiresAt: z.string().datetime(), status: z.enum(["pending", "accepted", "expired", "revoked"]),
});

export const familyContract = {
  listGuardians: oc.input(emptyInputSchema).output(z.object({
    canManage: z.boolean(), children: z.array(z.object({
      id: z.string().uuid(), fullName: z.string(), guardians: z.array(guardianSchema),
    })), pendingInvitations: z.array(invitationSchema),
  })),
  createInvitation: oc.input(z.object({ relationship: familyRelationshipSchema })).output(
    z.object({ id: z.string().uuid(), code: z.string().length(6), expiresAt: z.string().datetime() }),
  ),
  revokeInvitation: oc.input(z.object({ invitationId: z.string().uuid() })).output(successResponseSchema),
  removeGuardian: oc.input(z.object({ userId: z.string().uuid() })).output(successResponseSchema),
};
