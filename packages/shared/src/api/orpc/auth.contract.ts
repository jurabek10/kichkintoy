import { oc } from "@orpc/contract";
import { z } from "zod";
import { authUserSchema } from "../../auth/session.js";
import { uuidSchema } from "../../lib/validators.js";
import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  authResponseSchema,
  loginRequestSchema,
  lookupInvitationsRequestSchema,
  pendingInvitationSchema,
  registerRequestSchema,
  sendCodeRequestSchema,
  sendCodeResponseSchema,
  verifyCodeRequestSchema,
  verifyCodeResponseSchema,
} from "../auth.js";
import {
  cancelJoinRequestResponseSchema,
  submitJoinRequestResponseSchema,
  submitJoinRequestSchema,
} from "../membership.js";
import {
  emptyInputSchema,
  idInputSchema,
  successResponseSchema,
} from "./common.contract.js";

const logoutInputSchema = z.object({
  token: z.string().trim().min(1).optional(),
});

const meResponseSchema = z.object({
  user: authUserSchema.omit({ role: true }).extend({
    roles: z.array(
      z.object({
        name: z.string(),
        organizationId: uuidSchema.nullable(),
        centerId: uuidSchema.nullable(),
        branchId: uuidSchema.nullable(),
      }),
    ),
  }),
});

export const authContract = {
  telegramLoginStart: oc.input(emptyInputSchema).output(z.object({
    nonce: z.string(), deepLink: z.string().url(), expiresAt: z.string().datetime(),
  })),
  telegramLoginPoll: oc.input(z.object({ nonce: z.string().min(20) })).output(z.discriminatedUnion("status", [
    z.object({ status: z.literal("pending") }),
    z.object({ status: z.literal("expired") }),
    z.object({ status: z.literal("approved"), token: z.string(), expiresAt: z.string().datetime() }),
  ])),
  telegramVerifyStart: oc.input(emptyInputSchema).output(z.object({
    nonce: z.string(), deepLink: z.string().url(), expiresAt: z.string().datetime(),
  })),
  telegramVerifyPoll: oc.input(z.object({ nonce: z.string().min(20) })).output(z.discriminatedUnion("status", [
    z.object({ status: z.literal("pending") }),
    z.object({ status: z.literal("expired") }),
    z.object({ status: z.literal("verified"), phoneNumber: z.string(), verificationToken: z.string() }),
  ])),
  sendCode: oc.input(sendCodeRequestSchema).output(sendCodeResponseSchema),
  verifyCode: oc
    .input(verifyCodeRequestSchema)
    .output(verifyCodeResponseSchema),
  register: oc.input(registerRequestSchema).output(authResponseSchema),
  login: oc.input(loginRequestSchema).output(authResponseSchema),
  logout: oc.input(logoutInputSchema).output(successResponseSchema),
  lookupInvitations: oc
    .input(lookupInvitationsRequestSchema)
    .output(z.array(pendingInvitationSchema)),
  me: oc.input(emptyInputSchema).output(meResponseSchema),
  myInvitations: oc
    .input(emptyInputSchema)
    .output(z.array(pendingInvitationSchema)),
  acceptInvitation: oc
    .input(idInputSchema.extend({ body: acceptInvitationRequestSchema }))
    .output(acceptInvitationResponseSchema),
  declineInvitation: oc.input(idInputSchema).output(successResponseSchema),
  submitJoinRequest: oc
    .input(submitJoinRequestSchema)
    .output(submitJoinRequestResponseSchema),
  cancelJoinRequest: oc
    .input(idInputSchema)
    .output(cancelJoinRequestResponseSchema),
};
