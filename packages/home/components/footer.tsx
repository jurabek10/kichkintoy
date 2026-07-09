"use client";

import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { loginUrl, signupUrl } from "@/lib/utils";
import { Logo } from "./logo";

export function Footer() {
  const { t } = useLayoutTranslation("home");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background/70">
      <div aria-hidden="true" className="candy-trim h-1.5" />
      <div className="container grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo wordmarkClassName="text-white" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            {t("footer.tagline")}
          </p>
          <p className="mt-4 text-sm font-semibold">{t("footer.madeIn")}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            {t("footer.product")}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href="#features" className="hover:text-white">
                {t("nav.features")}
              </a>
            </li>
            <li>
              <a href="#roles" className="hover:text-white">
                {t("nav.roles")}
              </a>
            </li>
            <li>
              <a href="#payments" className="hover:text-white">
                {t("nav.payments")}
              </a>
            </li>
            <li>
              <a href={signupUrl} className="hover:text-white">
                {t("nav.signup")}
              </a>
            </li>
            <li>
              <a href={loginUrl} className="hover:text-white">
                {t("nav.login")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            {t("footer.contact")}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href="mailto:info@kichkintoy.uz" className="hover:text-white">
                info@kichkintoy.uz
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            {t("footer.legal")}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href="#" className="hover:text-white">
                {t("footer.terms")}
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                {t("footer.privacy")}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-6 text-center text-xs">
          {t("footer.copyright", { year })}
        </div>
      </div>
    </footer>
  );
}
