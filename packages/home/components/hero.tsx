"use client";

import { Sparkles } from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { loginUrl, signupUrl } from "@/lib/utils";
import {
  BalloonDoodle,
  CloudDoodle,
  PlaneDoodle,
  SparkDoodle,
  StarDoodle,
  SunDoodle,
} from "./doodles";
import { PhoneMockup } from "./phone-mockup";
import { Reveal } from "./reveal";

export function Hero() {
  const { t } = useLayoutTranslation("home");

  return (
    <section className="relative overflow-hidden bg-kids-dots">
      {/* Kidsnote-style playground doodles */}
      <SunDoodle className="absolute left-[4%] top-10 hidden h-16 w-16 md:block" />
      <CloudDoodle className="absolute right-[6%] top-8 hidden h-12 w-20 md:block" />
      <CloudDoodle className="absolute left-[16%] bottom-16 hidden h-9 w-16 opacity-70 lg:block" />
      <StarDoodle className="absolute left-[42%] top-24 hidden h-6 w-6 lg:block" />
      <SparkDoodle className="absolute right-[3%] bottom-24 hidden h-7 w-7 md:block" />

      <div className="container grid items-center gap-14 pb-24 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-16">
        <div className="text-center lg:text-left">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-primary shadow-card">
              <Sparkles className="h-3.5 w-3.5" />
              {t("hero.eyebrow")}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 font-brand text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
              {t("hero.title")}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              {t("hero.subtitle")}
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <a
                href={signupUrl}
                className="rounded-full bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-pop transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                {t("hero.ctaPrimary")}
              </a>
              <a
                href={loginUrl}
                className="rounded-full bg-white px-7 py-3.5 text-base font-bold text-primary shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <p className="mt-4 text-sm font-semibold text-muted-foreground">
              {t("hero.note")}
            </p>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative pt-4 lg:pt-0">
          <BalloonDoodle className="absolute -top-2 right-[6%] hidden h-20 w-11 sm:block" />
          {/* Paper plane swoops in over the phone, then keeps gliding */}
          <div className="absolute -top-8 left-[10%] z-10 hidden animate-fly-in [animation-delay:600ms] sm:block">
            <PlaneDoodle className="h-16 w-20 animate-float-slow" />
          </div>
          <PhoneMockup />
        </Reveal>
      </div>
    </section>
  );
}
