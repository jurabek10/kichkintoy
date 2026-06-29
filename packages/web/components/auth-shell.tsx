"use client";

import type { ReactNode } from "react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { KichkintoyMark } from "./kids-decor";
import { AuthLanguageSwitch } from "./auth-language-switch";
import { cn } from "@/lib/utils";

/**
 * The web auth frame, modelled on the mobile app's login screen: a calm, single
 * centered column with the language switch up top and the Kichkintoy brand mark
 * over the form — the same first impression on phone and desktop. We keep the
 * page quiet (one soft sky wash, no playroom decor) so the form is the focus.
 * `size="wide"` gives the multi-step signup more room than the lean login form.
 */
export function AuthShell({
  children,
  footer,
  size = "default",
}: {
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
}) {
  const { t } = useLayoutTranslation("app");

  return (
    <main className="relative flex min-h-dvh flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky/10 to-transparent" />

      <div className="relative flex justify-center px-6 pt-6">
        <AuthLanguageSwitch />
      </div>

      <div className="relative flex flex-1 flex-col items-center px-6 py-8 sm:py-10">
        <div
          className={cn(
            "my-auto w-full",
            size === "wide" ? "max-w-xl" : "max-w-md",
          )}
        >
          <div className="mb-7 flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-white shadow-pop ring-1 ring-black/5">
              <KichkintoyMark className="h-9 w-9" />
            </span>
            <span className="mt-3 font-brand text-2xl font-extrabold leading-none tracking-tight text-sky">
              Kichkintoy
            </span>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("authShell.title")}
            </p>
          </div>

          {children}

          {footer ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
