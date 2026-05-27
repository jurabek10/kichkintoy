import { z } from "zod";

export const membershipStatusValues = ["active", "pending"] as const;
export const membershipStatusSchema = z.enum(membershipStatusValues);
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
