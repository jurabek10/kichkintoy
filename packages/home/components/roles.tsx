"use client";

import { Baby, Check, LayoutDashboard, Users } from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const roles = [
  {
    key: "parent",
    Icon: Baby,
    headerTint: "bg-sky",
    iconTint: "bg-white text-sky-ink",
    checkTint: "text-sky-ink",
  },
  {
    key: "teacher",
    Icon: Users,
    headerTint: "bg-mint",
    iconTint: "bg-white text-mint-ink",
    checkTint: "text-mint-ink",
  },
  {
    key: "director",
    Icon: LayoutDashboard,
    headerTint: "bg-grape",
    iconTint: "bg-white text-grape-ink",
    checkTint: "text-grape-ink",
  },
] as const;

export function Roles() {
  const { t } = useLayoutTranslation("home");

  return (
    <section id="roles" className="scroll-mt-20 bg-white py-20 lg:py-24">
      <div className="container">
        <SectionHeading
          eyebrow={t("roles.eyebrow")}
          title={t("roles.title")}
          subtitle={t("roles.subtitle")}
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {roles.map(({ key, Icon, headerTint, iconTint, checkTint }, index) => {
            const bullets = t(`roles.${key}.bullets`, {
              returnObjects: true,
            }) as string[];
            return (
              <Reveal key={key} delay={index * 100}>
                <div className="h-full overflow-hidden rounded-3xl bg-card shadow-card transition-transform hover:-translate-y-1">
                  <div className={cn("flex items-center gap-4 p-6", headerTint)}>
                    <span
                      className={cn(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                        iconTint,
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <span>
                      <h3 className="font-brand text-xl font-bold text-foreground">
                        {t(`roles.${key}.name`)}
                      </h3>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {t(`roles.${key}.tagline`)}
                      </p>
                    </span>
                  </div>
                  <ul className="space-y-3 p-6">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <Check
                          className={cn("mt-0.5 h-4 w-4 shrink-0", checkTint)}
                        />
                        <span className="text-sm font-medium leading-relaxed text-foreground/85">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
