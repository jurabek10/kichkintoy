import { z } from "zod";
import { membershipStatusSchema } from "../membership/status.js";
import { authRoleSchema } from "./roles.js";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const authSessionSchema = z.object({
  token: z.string(),
  expiresAt: isoDateTimeSchema,
});

export type AuthSession = z.infer<typeof authSessionSchema>;

export const authUserSchema = z.object({
  id: uuidSchema,
  username: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  fullName: z.string(),
  role: authRoleSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const membershipSchema = z.object({
  status: membershipStatusSchema,
  joinRequestId: uuidSchema.nullable(),
  centerId: uuidSchema.nullable(),
  centerName: z.string().nullable(),
  // Whether this member may approve/reject join requests. Directors and org
  // owners always can; teachers only when the director grants it. Drives the
  // read-only vs. actionable state on the requests screen.
  canApproveMembers: z.boolean().default(false),
});

export type Membership = z.infer<typeof membershipSchema>;
