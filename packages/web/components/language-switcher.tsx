"use client";

import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cookieName, languages, type Language } from "@/i18n/settings";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";

export function LanguageSwitcher() {
  const { i18n, t } = useLayoutTranslation("common");
  const currentLanguage = (
    languages.includes(i18n.language as Language) ? i18n.language : "uz"
  ) as Language;

  function changeLanguage(language: Language) {
    document.cookie = `${cookieName}=${language}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = language;
    window.location.reload();
  }

  return (
    <Select value={currentLanguage} onValueChange={changeLanguage}>
      <SelectTrigger
        aria-label={t("language.label")}
        className="h-9 w-[118px] rounded-xl bg-white text-xs font-bold shadow-none"
      >
        <Languages className="mr-2 h-4 w-4 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {languages.map((language) => (
          <SelectItem key={language} value={language}>
            {t(`language.${language}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
