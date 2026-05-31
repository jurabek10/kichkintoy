import { z } from "zod";
import { centerSelectionPayloadSchema } from "../centers/models.js";
import { childRegistrationPayloadSchema } from "../child/registration.js";
import { directorSetupPayloadSchema } from "../membership/director-setup.js";
import { membershipSchema } from "../auth/session.js";

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
