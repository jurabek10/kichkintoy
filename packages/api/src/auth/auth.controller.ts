import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
} from "@nestjs/common";
import { ZodError, type ZodSchema } from "zod";
import { AuthService } from "./auth.service";
import {
  loginSchema,
  logoutSchema,
  registerSchema,
  sendCodeSchema,
  verifyCodeSchema,
} from "./auth.schemas";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("send-code")
  @Post("otp/request")
  sendCode(@Body() body: unknown) {
    return this.authService.sendCode(parseBody(sendCodeSchema, body));
  }

  @Post("verify-code")
  @Post("otp/verify")
  verifyCode(@Body() body: unknown) {
    return this.authService.verifyCode(parseBody(verifyCodeSchema, body));
  }

  @Post("register")
  register(@Body() body: unknown) {
    return this.authService.register(parseBody(registerSchema, body));
  }

  @Post("login")
  login(@Body() body: unknown) {
    return this.authService.login(parseBody(loginSchema, body));
  }

  @Post("logout")
  logout(
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
  ) {
    const parsedBody = parseBody(logoutSchema, body ?? {});
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const token = parsedBody.token ?? bearerToken;

    if (!token) {
      throw new BadRequestException("Session token is required.");
    }

    return this.authService.logout(token);
  }
}

function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
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
