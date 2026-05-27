import { z } from "zod";
import { authSessionSchema, authUserSchema, membershipSchema } from "../auth/session";
import { childRegistrationPayloadSchema } from "../child/registration";
import {
  centerClassSummarySchema,
  centerSelectionPayloadSchema,
} from "../centers/models";
import { directorSetupPayloadSchema } from "../membership/director-setup";
import { invitationKindSchema } from "../membership/invitation";
import { userRoleSchema } from "../auth/roles";
import { isoDateTimeSchema, phoneNumberSchema, uuidSchema } from "../lib/validators";

// --- OTP ---

export const sendCodeRequestSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export type SendCodeRequest = z.infer<typeof sendCodeRequestSchema>;

export const sendCodeResponseSchema = z.object({
  phoneNumber: phoneNumberSchema,
  expiresInSeconds: z.number().int(),
  delivery: z.string(),
  sent: z.boolean(),
  debugCode: z.string().optional(),
});

export type SendCodeResponse = z.infer<typeof sendCodeResponseSchema>;

export const verifyCodeRequestSchema = z.object({
  phoneNumber: phoneNumberSchema,
  code: z.string().trim().min(4).max(8),
});

export type VerifyCodeRequest = z.infer<typeof verifyCodeRequestSchema>;

export const verifyCodeResponseSchema = z.object({
  phoneNumber: phoneNumberSchema,
  verificationToken: z.string(),
});

export type VerifyCodeResponse = z.infer<typeof verifyCodeResponseSchema>;

// --- Login ---

export const loginRequestSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authResponseSchema = z.object({
  user: authUserSchema,
  session: authSessionSchema,
  membership: membershipSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// --- Register ---

export const registerRequestSchema = z.object({
  fullName: z.string().trim().min(1),
  phoneNumber: phoneNumberSchema,
  phoneVerificationToken: z.string().trim().min(1),
  username: z.string().trim().min(3).max(40),
  password: z.string().min(8),
  role: userRoleSchema,
  invitationId: uuidSchema.optional(),
  centerSelection: centerSelectionPayloadSchema.optional(),
  directorSetup: directorSetupPayloadSchema.optional(),
  child: childRegistrationPayloadSchema.optional(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const registerResponseSchema = authResponseSchema;
export type RegisterResponse = AuthResponse;

// --- Invitations (signup flow) ---

export const lookupInvitationsRequestSchema = z.object({
  phoneVerificationToken: z.string().trim().min(1),
});

export type LookupInvitationsRequest = z.infer<
  typeof lookupInvitationsRequestSchema
>;

export const pendingInvitationSchema = z.object({
  id: uuidSchema,
  kind: invitationKindSchema,
  childNameHint: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  center: z.object({
    id: uuidSchema,
    name: z.string(),
    centerCode: z.string(),
    facilityType: z.string(),
  }),
  class: centerClassSummarySchema.nullable(),
  invitedBy: z.object({
    id: uuidSchema,
    fullName: z.string(),
  }),
});

export type PendingInvitation = z.infer<typeof pendingInvitationSchema>;

export const acceptInvitationRequestSchema = z.object({
  child: childRegistrationPayloadSchema.optional(),
});

export type AcceptInvitationRequest = z.infer<
  typeof acceptInvitationRequestSchema
>;

export const acceptInvitationResponseSchema = z.object({
  membership: membershipSchema,
});

export type AcceptInvitationResponse = z.infer<
  typeof acceptInvitationResponseSchema
>;
