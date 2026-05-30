import { UnauthorizedException } from "@nestjs/common";
import {
  bearerToken,
  requestContext,
  requireUser,
  type ORPCDeps,
  type ORPCImplementer,
} from "../context";
import {
  acceptInvitationSchema,
  registerSchema,
  submitJoinRequestSchema,
} from "../../auth/auth.schemas";

export function createAuthRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
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
    lookupInvitations: os.auth.lookupInvitations.handler(({ input }) =>
      deps.authService.lookupInvitationsByVerification(
        input.phoneVerificationToken,
      ),
    ),
    me: os.auth.me.handler(async ({ context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return { user };
    }),
    myInvitations: os.auth.myInvitations.handler(async ({ context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.authService.listMyInvitations(user.id);
    }),
    acceptInvitation: os.auth.acceptInvitation.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.authService.acceptInvitation(
          user.id,
          input.id,
          acceptInvitationSchema.parse(input.body).child,
        );
      },
    ),
    declineInvitation: os.auth.declineInvitation.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.authService.declineInvitation(user.id, input.id);
      },
    ),
    submitJoinRequest: os.auth.submitJoinRequest.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.authService.submitJoinRequest(
          user.id,
          submitJoinRequestSchema.parse(input),
        );
      },
    ),
    cancelJoinRequest: os.auth.cancelJoinRequest.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.authService.cancelJoinRequest(user.id, input.id);
      },
    ),
  };
}
