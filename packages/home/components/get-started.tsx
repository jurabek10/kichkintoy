"use client";

import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { loginUrl, signupUrl } from "@/lib/utils";
import { BalloonDoodle, HeartDoodle, StarDoodle } from "./doodles";
import { Reveal } from "./reveal";

export function GetStarted() {
  const { t } = useLayoutTranslation("home");

  return (
    <section id="get-started" className="container scroll-mt-20 py-20 lg:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-card shadow-pop">
          <div aria-hidden="true" className="candy-trim h-2" />
          <BalloonDoodle className="absolute left-[6%] top-12 hidden h-16 w-9 sm:block" />
          <StarDoodle className="absolute right-[8%] top-10 hidden h-7 w-7 sm:block" />
          <HeartDoodle className="absolute bottom-10 right-[13%] hidden h-6 w-7 md:block" />
          <div className="px-6 py-14 text-center sm:px-12 lg:py-16">
            <h2 className="mx-auto max-w-xl font-brand text-3xl font-bold text-foreground sm:text-4xl">
              {t("download.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("download.subtitle")}
            </p>
            <a
              href={signupUrl}
              className="mt-8 inline-block rounded-full bg-primary px-9 py-4 text-base font-bold text-primary-foreground shadow-pop transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              {t("download.cta")}
            </a>
            <p className="mt-5 text-sm font-semibold text-muted-foreground">
              {t("download.loginHint")}{" "}
              <a
                href={loginUrl}
                className="font-bold text-primary underline-offset-4 hover:underline"
              >
                {t("download.login")}
              </a>
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
