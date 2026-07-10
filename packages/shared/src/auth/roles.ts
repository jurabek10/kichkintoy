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
  "super_admin",
] as const;
export const roleNameSchema = z.enum(roleNameValues);
export type RoleName = z.infer<typeof roleNameSchema>;

/**
 * Roles a signed-in session can carry. Extends the signup picker roles with
 * the scope-less platform `super_admin` (granted only via seed script — it is
 * never offered at signup).
 */
export const authRoleValues = [...userRoleValues, "super_admin"] as const;
export const authRoleSchema = z.enum(authRoleValues);
export type AuthRole = z.infer<typeof authRoleSchema>;
