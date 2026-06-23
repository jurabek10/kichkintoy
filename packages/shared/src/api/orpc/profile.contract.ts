import { oc } from "@orpc/contract";
import {
  changePasswordInputSchema,
  notificationSettingsSchema,
  profileViewSchema,
  updateAvatarInputSchema,
  updateNotificationSettingsInputSchema,
  updatePhoneInputSchema,
  updateProfileInputSchema,
} from "../profile.js";
import { emptyInputSchema, successResponseSchema } from "./common.contract.js";

export const profileContract = {
  get: oc.input(emptyInputSchema).output(profileViewSchema),
  updateProfile: oc
    .input(updateProfileInputSchema)
    .output(profileViewSchema),
  updatePhone: oc.input(updatePhoneInputSchema).output(profileViewSchema),
  changePassword: oc
    .input(changePasswordInputSchema)
    .output(successResponseSchema),
  updateAvatar: oc.input(updateAvatarInputSchema).output(profileViewSchema),
  removeAvatar: oc.input(emptyInputSchema).output(profileViewSchema),
  updateNotificationSettings: oc
    .input(updateNotificationSettingsInputSchema)
    .output(notificationSettingsSchema),
};
