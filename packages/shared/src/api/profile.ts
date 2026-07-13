import { z } from "zod";
import { userRoleSchema } from "../auth/roles.js";
import { childGenderSchema } from "../child/gender.js";
import { appLanguageSchema } from "../lib/language.js";
import {
  isoDateSchema,
  phoneNumberSchema,
  uuidSchema,
} from "../lib/validators.js";
import { updateChildRequestSchema } from "./classes.js";

/** "HH:mm" (24-hour). Used for notification quiet hours. */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected a time like 22:00.");

export const notificationSettingsSchema = z.object({
  pushEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  quietHoursStart: timeOfDaySchema.nullable(),
  quietHoursEnd: timeOfDaySchema.nullable(),
});
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

/** Teacher-specific account fields. Present only when the user is a teacher. */
export const teacherProfileViewSchema = z.object({
  employeeNumber: z.string().nullable(),
  bio: z.string().nullable(),
});
export type TeacherProfileView = z.infer<typeof teacherProfileViewSchema>;

/** The full account view rendered by the "My Page" screen. */
export const profileViewSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  username: z.string().nullable(),
  role: userRoleSchema,
  centerId: uuidSchema.nullable(),
  centerName: z.string().nullable(),
  preferredLanguage: appLanguageSchema,
  avatarMediaAssetId: uuidSchema.nullable(),
  notificationSettings: notificationSettingsSchema,
  teacher: teacherProfileViewSchema.nullable(),
  // Telegram-born users have no AuthCredential; clients hide password/phone forms for them.
  hasPassword: z.boolean(),
  telegramUsername: z.string().nullable(),
});
export type ProfileView = z.infer<typeof profileViewSchema>;

export const updateProfileInputSchema = z.object({
  fullName: z.string().trim().min(1, "Enter a name."),
  username: z.string().trim().min(3).max(40),
  // Empty string clears the email; otherwise it must be a valid address.
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .or(z.literal(""))
    .nullable()
    .optional(),
  preferredLanguage: appLanguageSchema,
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const updatePhoneInputSchema = z.object({
  phoneNumber: phoneNumberSchema,
  phoneVerificationToken: z.string().trim().min(1),
});
export type UpdatePhoneInput = z.infer<typeof updatePhoneInputSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include a letter.")
    .regex(/\d/, "Include a number."),
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const updateAvatarInputSchema = z.object({
  mediaAssetId: uuidSchema,
});
export type UpdateAvatarInput = z.infer<typeof updateAvatarInputSchema>;

export const updateTeacherProfileInputSchema = z.object({
  bio: z.string().trim().max(280, "Keep your bio under 280 characters.").nullable(),
});
export type UpdateTeacherProfileInput = z.infer<
  typeof updateTeacherProfileInputSchema
>;

export const updateNotificationSettingsInputSchema = z.object({
  pushEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  quietHoursStart: timeOfDaySchema.nullable().optional(),
  quietHoursEnd: timeOfDaySchema.nullable().optional(),
});
export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsInputSchema
>;

// --- Parent: children ---

/** A child the signed-in parent guards, with editable fields + read-only context. */
export const parentChildSchema = z.object({
  id: uuidSchema,
  firstName: z.string(),
  lastName: z.string().nullable(),
  name: z.string(),
  dateOfBirth: isoDateSchema.nullable(),
  gender: childGenderSchema.nullable(),
  // Resolve to a signed URL via media.getDownloadUrl when present...
  photoMediaAssetId: uuidSchema.nullable(),
  // ...otherwise fall back to a legacy direct URL stored at signup.
  photoUrl: z.string().nullable(),
  allergies: z.string().nullable(),
  medicalNotes: z.string().nullable(),
  centerId: uuidSchema.nullable(),
  centerName: z.string().nullable(),
  className: z.string().nullable(),
  relationship: z.string().nullable(),
  isPrimary: z.boolean(),
});
export type ParentChild = z.infer<typeof parentChildSchema>;

export const parentUpdateChildInputSchema = z.object({
  childId: uuidSchema,
  body: updateChildRequestSchema,
});
export type ParentUpdateChildInput = z.infer<
  typeof parentUpdateChildInputSchema
>;

export const updateChildPhotoInputSchema = z.object({
  childId: uuidSchema,
  mediaAssetId: uuidSchema,
});
export type UpdateChildPhotoInput = z.infer<typeof updateChildPhotoInputSchema>;

export const childIdInputSchema = z.object({ childId: uuidSchema });
export type ChildIdInput = z.infer<typeof childIdInputSchema>;
