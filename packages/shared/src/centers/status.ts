import { z } from "zod";

export const centerStatusValues = [
  "active",
  "inactive",
  "pending_verification",
  // Suspended by the platform admin: hidden from signup search and blocked
  // from new join requests/invitations; existing members keep access.
  "suspended",
] as const;

export const centerStatusSchema = z.enum(centerStatusValues);
export type CenterStatus = z.infer<typeof centerStatusSchema>;
