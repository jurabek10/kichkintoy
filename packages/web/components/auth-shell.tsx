import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";

export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-muted/40">
      <header className="mx-auto flex w-full max-w-shell items-center justify-between px-6 py-6">
        <BrandMark />
      </header>
      <div className="mx-auto flex w-full max-w-shell flex-col items-center px-6 pb-16">
        <div className="w-full max-w-auth-card">{children}</div>
        {footer ? (
          <div className="mt-6 w-full max-w-auth-card text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}
