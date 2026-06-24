/**
 * App-level error codes shared by the API and the clients.
 *
 * The API throws these codes (see `AppException`); the oRPC handler carries the
 * code to the client, and the web/mobile apps map it to a friendly, translated
 * message (uz/ru/en). The string values are the stable contract — never reuse
 * or repurpose one, only add new ones. Default English text lives in
 * `APP_ERROR_FALLBACKS` for logs and as a last-resort client fallback.
 */
export const APP_ERROR_CODES = [
  // Auth / session
  "AUTH_REQUIRED",
  "SESSION_EXPIRED",
  // Center access
  "CENTER_NOT_FOUND",
  "CENTER_ACCESS_REQUIRED",
  "DIRECTOR_ACCESS_REQUIRED",
  "NO_APPROVER_ACCESS",
  // Generic fallback for anything unmapped
  "INTERNAL_ERROR",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

const codeSet = new Set<string>(APP_ERROR_CODES);

/** Narrows an arbitrary string to a known `AppErrorCode`. */
export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === "string" && codeSet.has(value);
}

/**
 * English fallbacks. Clients translate by code first; these are used for server
 * logs and when a client has no translation for the code yet.
 */
export const APP_ERROR_FALLBACKS: Record<AppErrorCode, string> = {
  AUTH_REQUIRED: "Please sign in to continue.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  CENTER_NOT_FOUND: "We couldn't find this center.",
  CENTER_ACCESS_REQUIRED: "You don't have access to this center.",
  DIRECTOR_ACCESS_REQUIRED: "Only directors can do this.",
  NO_APPROVER_ACCESS:
    "You can view requests, but only the director or an approver can approve or reject them.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};
