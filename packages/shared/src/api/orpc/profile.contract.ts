import { oc } from "@orpc/contract";
import { z } from "zod";
import {
  changePasswordInputSchema,
  childIdInputSchema,
  notificationSettingsSchema,
  parentChildSchema,
  parentUpdateChildInputSchema,
  profileViewSchema,
  updateAvatarInputSchema,
  updateChildPhotoInputSchema,
  updateNotificationSettingsInputSchema,
  updatePhoneInputSchema,
  updateProfileInputSchema,
  updateTeacherProfileInputSchema,
} from "../profile.js";
import { emptyInputSchema, successResponseSchema } from "./common.contract.js";

export const profileContract = {
  get: oc.input(emptyInputSchema).output(profileViewSchema),
  updateProfile: oc
    .input(updateProfileInputSchema)
    .output(profileViewSchema),
  updateTeacherProfile: oc
    .input(updateTeacherProfileInputSchema)
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
  listChildren: oc
    .input(emptyInputSchema)
    .output(z.array(parentChildSchema)),
  updateChild: oc
    .input(parentUpdateChildInputSchema)
    .output(parentChildSchema),
  updateChildPhoto: oc
    .input(updateChildPhotoInputSchema)
    .output(parentChildSchema),
  removeChildPhoto: oc.input(childIdInputSchema).output(parentChildSchema),
};
