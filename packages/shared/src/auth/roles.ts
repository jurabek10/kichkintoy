import { z } from "zod";

/** Signup role picker values (director, parent, teacher). */
export const userRoleValues = ["director", "parent", "teacher"] as const;
export const userRoleSchema = z.enum(userRoleValues);
export type UserRole = z.infer<typeof userRoleSchema>;

/** All role names stored on `user_roles`, including organization_owner. */
export const roleNameValues = [
  "parent",
  "teacher",
  "director",
  "organization_owner",
] as const;
export const roleNameSchema = z.enum(roleNameValues);
export type RoleName = z.infer<typeof roleNameSchema>;
