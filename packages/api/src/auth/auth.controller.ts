import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ZodError, type ZodSchema } from "zod";
import { AuthService, type RequestContext } from "./auth.service";
import {
  acceptInvitationSchema,
  loginSchema,
  logoutSchema,
  lookupInvitationsSchema,
  registerSchema,
  sendCodeSchema,
  submitJoinRequestSchema,
  verifyCodeSchema,
} from "./auth.schemas";
import { CurrentUser } from "./current-user.decorator";
import { SessionGuard, type AuthenticatedUser } from "./session.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("send-code")
  @Post("otp/request")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendCode(@Body() body: unknown, @Ip() ip: string, @Headers("user-agent") ua?: string) {
    return this.authService.sendCode(
      parseInput(sendCodeSchema, body),
      requestContext(ip, ua),
    );
  }

  @Post("verify-code")
  @Post("otp/verify")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyCode(@Body() body: unknown, @Ip() ip: string, @Headers("user-agent") ua?: string) {
    return this.authService.verifyCode(
      parseInput(verifyCodeSchema, body),
      requestContext(ip, ua),
    );
  }

  @Post("register")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() body: unknown, @Ip() ip: string, @Headers("user-agent") ua?: string) {
    return this.authService.register(
      parseInput(registerSchema, body),
      requestContext(ip, ua),
    );
  }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() body: unknown, @Ip() ip: string, @Headers("user-agent") ua?: string) {
    return this.authService.login(
      parseInput(loginSchema, body),
      requestContext(ip, ua),
    );
  }

  @Post("logout")
  logout(
    @Body() body: unknown,
    @Ip() ip: string,
    @Headers("authorization") authorization?: string,
    @Headers("user-agent") ua?: string,
  ) {
    const parsedBody = parseInput(logoutSchema, body ?? {});
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const token = parsedBody.token ?? bearerToken;

    if (!token) {
      throw new BadRequestException("Session token is required.");
    }

    return this.authService.logout(token, requestContext(ip, ua));
  }

  @Post("invitations/lookup")
  lookupInvitations(@Body() body: unknown) {
    const parsed = parseInput(lookupInvitationsSchema, body ?? {});
    return this.authService.lookupInvitationsByVerification(
      parsed.phoneVerificationToken,
    );
  }

  @Get("me")
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Get("me/invitations")
  @UseGuards(SessionGuard)
  myInvitations(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listMyInvitations(user.id);
  }

  @Post("me/invitations/:invitationId/accept")
  @UseGuards(SessionGuard)
  acceptInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId", new ParseUUIDPipe()) invitationId: string,
    @Body() body: unknown,
  ) {
    const parsed = parseInput(acceptInvitationSchema, body ?? {});
    return this.authService.acceptInvitation(
      user.id,
      invitationId,
      parsed.child,
    );
  }

  @Post("me/invitations/:invitationId/decline")
  @UseGuards(SessionGuard)
  declineInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("invitationId", new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.authService.declineInvitation(user.id, invitationId);
  }

  @Post("me/join-requests")
  @UseGuards(SessionGuard)
  submitJoinRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.authService.submitJoinRequest(
      user.id,
      parseInput(submitJoinRequestSchema, body),
    );
  }

  @Delete("me/join-requests/:requestId")
  @UseGuards(SessionGuard)
  cancelJoinRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId", new ParseUUIDPipe()) requestId: string,
  ) {
    return this.authService.cancelJoinRequest(user.id, requestId);
  }
}

function requestContext(ip?: string, userAgent?: string): RequestContext {
  return {
    ipAddress: ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
  };
}

function parseInput<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: "Validation failed.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    throw error;
  }
}
