import { z } from "zod";
import { centerSelectionPayloadSchema } from "../centers/models.js";
import { childRegistrationPayloadSchema } from "../child/registration.js";
import { directorSetupPayloadSchema } from "../membership/director-setup.js";
import { membershipSchema } from "../auth/session.js";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const submitJoinRequestSchema = z.object({
  centerSelection: centerSelectionPayloadSchema.optional(),
  directorSetup: directorSetupPayloadSchema.optional(),
  child: childRegistrationPayloadSchema.optional(),
});

export type SubmitJoinRequest = z.infer<typeof submitJoinRequestSchema>;

export const submitJoinRequestResponseSchema = z.object({
  membership: membershipSchema,
});

export type SubmitJoinRequestResponse = z.infer<
  typeof submitJoinRequestResponseSchema
>;

export const cancelJoinRequestResponseSchema = z.object({
  success: z.boolean(),
});

export type CancelJoinRequestResponse = z.infer<
  typeof cancelJoinRequestResponseSchema
>;

/** In-app "add a kid" request from an already-active parent. */
export const requestChildJoinSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema.optional(),
  child: childRegistrationPayloadSchema,
  message: z.string().trim().max(500).optional(),
});

export type RequestChildJoin = z.infer<typeof requestChildJoinSchema>;

export const requestChildJoinResponseSchema = z.object({
  requestId: uuidSchema,
  centerId: uuidSchema,
  centerName: z.string(),
});

export type RequestChildJoinResponse = z.infer<
  typeof requestChildJoinResponseSchema
>;

/** A parent's own pending kid join request, shown in the kid switcher. */
export const myJoinRequestSchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  centerName: z.string(),
  className: z.string().nullable(),
  childName: z.string().nullable(),
  childPhotoUrl: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});

export type MyJoinRequest = z.infer<typeof myJoinRequestSchema>;
