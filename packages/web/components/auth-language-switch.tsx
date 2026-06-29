"use client";

import {
  cookieName,
  languages,
  type Language,
} from "@kichkintoy/translations/settings";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";

/**
 * The segmented uz/ru/en switch that sits at the top of the auth screens — the
 * web twin of the mobile app's LanguageSwitch, so a family lands on the same
 * control on either device. Locale is a cookie the server reads on the next
 * request, so picking a language reloads with everything already translated.
 */
export function AuthLanguageSwitch() {
  const { i18n, t } = useLayoutTranslation("common");
  const current = (
    languages.includes(i18n.language as Language) ? i18n.language : "uz"
  ) as Language;

  function change(language: Language) {
    if (language === current) return;
    document.cookie = `${cookieName}=${language}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = language;
    window.location.reload();
  }

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className="inline-flex rounded-full border bg-card p-1 shadow-sm"
    >
      {languages.map((language) => {
        const active = language === current;
        return (
          <button
            key={language}
            type="button"
            onClick={() => change(language)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wide transition",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {language}
          </button>
        );
      })}
    </div>
  );
}
