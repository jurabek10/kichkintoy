"use client";

import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "./errors";

/**
 * Turns any thrown error into a friendly, localized message a non-technical
 * user can act on. Coded API errors translate via the `errors` namespace;
 * validation issues surface their first message; everything else falls back to
 * the server's message or a generic line — so users never see "Internal error".
 */
export function useErrorText() {
  const { t } = useLayoutTranslation("errors");
  return (error: unknown): string => {
    const err = toApiError(error);
    if (err.code) {
      return t(`codes.${err.code}`, {
        defaultValue: err.message || t("generic"),
      });
    }
    if (err.issues[0]?.message) return err.issues[0].message;
    return err.message || t("generic");
  };
}
