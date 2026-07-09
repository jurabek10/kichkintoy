"use client";

import {
  cookieName,
  languages,
  type Language,
} from "@kichkintoy/translations/settings";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";

const shortLabels: Record<Language, string> = {
  uz: "O'z",
  ru: "Ру",
  en: "En",
};

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useLayoutTranslation("home");
  const currentLanguage = (
    languages.includes(i18n.language as Language) ? i18n.language : "uz"
  ) as Language;

  function changeLanguage(language: Language) {
    document.cookie = `${cookieName}=${language}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = language;
    window.location.reload();
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full bg-white p-1 shadow-card",
        className,
      )}
    >
      {languages.map((language) => (
        <button
          key={language}
          type="button"
          onClick={() => changeLanguage(language)}
          aria-pressed={language === currentLanguage}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
            language === currentLanguage
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {shortLabels[language]}
        </button>
      ))}
    </div>
  );
}
