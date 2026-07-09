"use client";

import { Check, Wallet } from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { Reveal } from "./reveal";

export function Payments() {
  const { t } = useLayoutTranslation("home");
  const bullets = t("payments.bullets", { returnObjects: true }) as string[];

  return (
    <section id="payments" className="scroll-mt-20 bg-primary-deep">
      <div aria-hidden="true" className="candy-trim h-1.5" />
      <div className="container grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-wider text-sunshine">
              {t("payments.eyebrow")}
            </p>
            <h2 className="mt-3 font-brand text-3xl font-bold leading-snug text-white sm:text-4xl">
              {t("payments.title")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              {t("payments.subtitle")}
            </p>
          </Reveal>
          <ul className="mt-8 space-y-4">
            {bullets.map((bullet, index) => (
              <Reveal key={bullet} delay={index * 90}>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint text-mint-ink">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-base font-medium leading-relaxed text-white/90">
                    {bullet}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        {/* Mock tuition invoice — mirrors the parent payments screen */}
        <Reveal delay={150}>
          <div className="mx-auto w-full max-w-sm animate-float-slow rounded-3xl bg-white p-7 shadow-pop">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">
                {t("payments.invoice.label")}
              </p>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-sunshine text-sunshine-ink">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground">
              {t("payments.invoice.child")}
            </p>
            <p className="mt-5 font-brand text-4xl font-bold text-foreground">
              {t("payments.invoice.amount")}
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-mint-ink">
                {t("payments.invoice.status")}
              </span>
              <p className="text-xs font-semibold text-muted-foreground">
                {t("payments.invoice.method")}
              </p>
            </div>
            <div className="mt-5 flex gap-2.5">
              <span className="flex-1 rounded-xl bg-[#33CCCC]/15 py-2.5 text-center text-sm font-bold text-[#0E7490]">
                Payme
              </span>
              <span className="flex-1 rounded-xl bg-[#0072FF]/10 py-2.5 text-center text-sm font-bold text-[#0057C2]">
                Click
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
