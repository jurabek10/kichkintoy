import { HttpException } from "@nestjs/common";
import { ORPCError } from "@orpc/server";
import { AppException } from "../common/app-exception";

/**
 * oRPC hides the details of any error a handler throws and reports a generic
 * "Internal server error" to the client — which is why a NestJS exception (e.g.
 * a `ForbiddenException`) used to reach the user as an unreadable internal
 * error. This maps our intentional exceptions back into an `ORPCError` so their
 * status, message, and — for `AppException` — translatable `code` survive the
 * trip to the client. Unknown errors stay generic so internals don't leak.
 */
const STATUS_TO_ORPC_CODE: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
};

export function toORPCError(error: unknown): ORPCError<string, unknown> {
  if (error instanceof ORPCError) return error;

  if (error instanceof HttpException) {
    const status = error.getStatus();
    const appCode = error instanceof AppException ? error.code : undefined;
    return new ORPCError(
      appCode ?? STATUS_TO_ORPC_CODE[status] ?? "INTERNAL_SERVER_ERROR",
      {
        status,
        message: extractMessage(error),
        // The client translates by `code`; only attach it for coded errors so
        // generic exceptions fall back to their (already human) message.
        data: appCode ? { code: appCode } : undefined,
      },
    );
  }

  // Unknown/unexpected: don't expose the message.
  return new ORPCError("INTERNAL_SERVER_ERROR", { status: 500 });
}

/** Pulls the human message out of a Nest exception's response shape. */
function extractMessage(error: HttpException): string {
  const response = error.getResponse();
  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const message = (response as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") {
      return message[0];
    }
  }
  return error.message;
}
