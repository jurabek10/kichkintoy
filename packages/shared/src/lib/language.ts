import { z } from "zod";

export const appLanguageValues = ["uz", "ru"] as const;
export const appLanguageSchema = z.enum(appLanguageValues);
export type AppLanguage = z.infer<typeof appLanguageSchema>;
