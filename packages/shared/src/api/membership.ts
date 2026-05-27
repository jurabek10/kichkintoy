import { z } from "zod";
import { centerSelectionPayloadSchema } from "../centers/models";
import { childRegistrationPayloadSchema } from "../child/registration";
import { directorSetupPayloadSchema } from "../membership/director-setup";
import { membershipSchema } from "../auth/session";

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
  success: z.literal(true),
});

export type CancelJoinRequestResponse = z.infer<
  typeof cancelJoinRequestResponseSchema
>;
