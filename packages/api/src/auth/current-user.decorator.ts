import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from "@nestjs/common";
import type { AuthenticatedUser, RequestWithUser } from "./session.guard";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new InternalServerErrorException(
        "Authenticated user is not attached to the request. Did you forget to apply SessionGuard?",
      );
    }

    return user;
  },
);
