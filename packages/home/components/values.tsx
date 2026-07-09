"use client";

import {
  HeartHandshake,
  Languages,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const items = [
  { key: "free", Icon: HeartHandshake, tint: "bg-coral text-coral-ink" },
  {
    key: "devices",
    Icon: MonitorSmartphone,
    tint: "bg-sky text-sky-ink",
  },
  { key: "languages", Icon: Languages, tint: "bg-sunshine text-sunshine-ink" },
  { key: "payments", Icon: ShieldCheck, tint: "bg-mint text-mint-ink" },
] as const;

export function Values() {
  const { t } = useLayoutTranslation("home");

  return (
    <section className="bg-white py-20">
      <div className="container">
        <SectionHeading
          title={t("values.title")}
          subtitle={t("values.subtitle")}
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ key, Icon, tint }, index) => (
            <Reveal key={key} delay={index * 90}>
              <div className="h-full rounded-3xl bg-card p-6 shadow-card transition-transform hover:-translate-y-1">
                <span
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-2xl",
                    tint,
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-brand text-lg font-bold text-foreground">
                  {t(`values.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`values.${key}.description`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
