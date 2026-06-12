import type { Config } from "next-i18n-router/dist/types";
import { cookieName, fallbackLng, languages } from "../settings";

const i18nConfig: Config = {
  locales: [...languages],
  defaultLocale: fallbackLng,
  noPrefix: true,
  localeCookie: cookieName,
};

export default i18nConfig;
