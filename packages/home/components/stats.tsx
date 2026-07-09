"use client";

import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { Reveal } from "./reveal";

const statKeys = ["roles", "languages", "modules", "free"] as const;

export function Stats() {
  const { t } = useLayoutTranslation("home");

  return (
    <section className="bg-primary-deep">
      <div aria-hidden="true" className="candy-trim h-1.5" />
      <div className="container grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4">
        {statKeys.map((key, index) => (
          <Reveal key={key} delay={index * 80} className="text-center">
            <p className="font-brand text-3xl font-bold text-white sm:text-4xl">
              {t(`stats.${key}.value`)}
            </p>
            <p className="mx-auto mt-2 max-w-[180px] text-sm font-semibold leading-snug text-white/70">
              {t(`stats.${key}.label`)}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
