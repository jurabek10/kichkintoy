import { HttpException, HttpStatus } from "@nestjs/common";
import {
  APP_ERROR_FALLBACKS,
  type AppErrorCode,
} from "@kichkintoy/shared";

/**
 * A domain error that carries a stable {@link AppErrorCode}. The oRPC handler
 * turns it into an `ORPCError` whose `code` the clients translate into a
 * friendly, localized message — so users never see a raw "Internal error".
 *
 * Throw it from services/middleware instead of a bare Nest exception when the
 * client should show a specific, translated message:
 *
 *   throw new AppException("NO_APPROVER_ACCESS", HttpStatus.FORBIDDEN);
 */
export class AppException extends HttpException {
  constructor(
    readonly code: AppErrorCode,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    message: string = APP_ERROR_FALLBACKS[code],
  ) {
    super(message, status);
  }
}
