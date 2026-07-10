import { z } from "zod";

export const invitationKindValues = ["parent", "teacher", "director"] as const;
export const invitationKindSchema = z.enum(invitationKindValues);
export type InvitationKind = z.infer<typeof invitationKindSchema>;

export const invitationStatusValues = [
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
] as const;

export const invitationStatusSchema = z.enum(invitationStatusValues);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
