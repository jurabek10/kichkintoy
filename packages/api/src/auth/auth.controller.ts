import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ZodError, type ZodSchema } from "zod";
import { AuthService } from "./auth.service";
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
  sendCode(@Body() body: unknown) {
    return this.authService.sendCode(parseInput(sendCodeSchema, body));
  }

  @Post("verify-code")
  @Post("otp/verify")
  verifyCode(@Body() body: unknown) {
    return this.authService.verifyCode(parseInput(verifyCodeSchema, body));
  }

  @Post("register")
  register(@Body() body: unknown) {
    return this.authService.register(parseInput(registerSchema, body));
  }

  @Post("login")
  login(@Body() body: unknown) {
    return this.authService.login(parseInput(loginSchema, body));
  }

  @Post("logout")
  logout(
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
  ) {
    const parsedBody = parseInput(logoutSchema, body ?? {});
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const token = parsedBody.token ?? bearerToken;

    if (!token) {
      throw new BadRequestException("Session token is required.");
    }

    return this.authService.logout(token);
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
