import { UnauthorizedException } from "@nestjs/common";
import { z } from "zod";
import { pendingInvitationSchema } from "@kichkintoy/shared";
import {
  bearerToken,
  requestContext,
  type ORPCDeps,
  type ORPCImplementer,
} from "../orpc/context";
import { createAccess } from "../orpc/access";
import {
  acceptInvitationSchema,
  registerSchema,
  submitJoinRequestSchema,
} from "./auth.schemas";

const pendingInvitationsSchema = z.array(pendingInvitationSchema);

export function createAuthRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    telegramLoginStart: os.auth.telegramLoginStart.handler(() => deps.telegramAuthService.start()),
    telegramLoginPoll: os.auth.telegramLoginPoll.handler(({ input }) => deps.telegramAuthService.poll(input.nonce)),
    telegramVerifyStart: os.auth.telegramVerifyStart.handler(() => deps.telegramAuthService.startVerify()),
    telegramVerifyPoll: os.auth.telegramVerifyPoll.handler(({ input }) => deps.telegramAuthService.pollVerify(input.nonce)),
    sendCode: os.auth.sendCode.handler(({ input, context }) =>
      deps.authService.sendCode(input, requestContext(context.req)),
    ),
    verifyCode: os.auth.verifyCode.handler(({ input, context }) =>
      deps.authService.verifyCode(input, requestContext(context.req)),
    ),
    register: os.auth.register.handler(({ input, context }) =>
      deps.authService.register(
        registerSchema.parse(input),
        requestContext(context.req),
      ),
    ),
    login: os.auth.login.handler(({ input, context }) =>
      deps.authService.login(input, requestContext(context.req)),
    ),
    logout: os.auth.logout.handler(async ({ input, context }) => {
      const token = input.token ?? bearerToken(context.req);
      if (!token) {
        throw new UnauthorizedException("Session token is required.");
      }
      return deps.authService.logout(token, requestContext(context.req));
    }),
    lookupInvitations: os.auth.lookupInvitations.handler(async ({ input }) =>
      pendingInvitationsSchema.parse(
        await deps.authService.lookupInvitationsByVerification(
          input.phoneVerificationToken,
        ),
      ),
    ),
    me: os.auth.me.use(access.authed).handler(({ context }) => ({
      user: context.user,
    })),
    myInvitations: os.auth.myInvitations
      .use(access.authed)
      .handler(async ({ context }) =>
        pendingInvitationsSchema.parse(
          await deps.authService.listMyInvitations(context.user.id),
        ),
      ),
    acceptInvitation: os.auth.acceptInvitation
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.authService.acceptInvitation(
          context.user.id,
          input.id,
          acceptInvitationSchema.parse(input.body).child,
        ),
      ),
    declineInvitation: os.auth.declineInvitation
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.authService.declineInvitation(context.user.id, input.id),
      ),
    submitJoinRequest: os.auth.submitJoinRequest
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.authService.submitJoinRequest(
          context.user.id,
          submitJoinRequestSchema.parse(input),
        ),
      ),
    cancelJoinRequest: os.auth.cancelJoinRequest
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.authService.cancelJoinRequest(context.user.id, input.id),
      ),
  };
}
