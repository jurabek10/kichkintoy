export const fallbackLng = "uz";
export const languages = [fallbackLng, "en", "ru"] as const;
export type Language = (typeof languages)[number];
export const defaultNS = "common";
export const cookieName = "i18next";

export function isSupportedLanguage(language: string): language is Language {
  return languages.includes(language as Language);
}
