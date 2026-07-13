import en from "@kichkintoy/translations/locales/en/bot.json";
import ru from "@kichkintoy/translations/locales/ru/bot.json";
import uz from "@kichkintoy/translations/locales/uz/bot.json";

const bundles = { uz, ru, en } as const;

export type BotLang = keyof typeof bundles;

export const isBotLang = (value: string | undefined | null): value is BotLang =>
  value === "uz" || value === "ru" || value === "en";

/** Bot copy lives in packages/translations (bot.json per locale); keys are flat or one level deep. */
export function botText(lang: BotLang, key: string, params?: Record<string, string>): string {
  const bundle: Record<string, unknown> = bundles[lang];
  let value: unknown = bundle;
  for (const part of key.split(".")) value = (value as Record<string, unknown> | undefined)?.[part];
  let text = typeof value === "string" ? value : key;
  for (const [name, replacement] of Object.entries(params ?? {})) text = text.replaceAll(`{{${name}}}`, replacement);
  return text;
}

/** Messages are sent with parse_mode=HTML, so user-provided names must be escaped. */
export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
