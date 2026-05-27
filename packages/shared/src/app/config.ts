import { z } from "zod";
import { appLanguageSchema } from "../lib/language.js";

export const appConfigSchema = z.object({
  name: z.literal("Kichkintoy"),
  defaultLanguage: appLanguageSchema,
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig: AppConfig = {
  name: "Kichkintoy",
  defaultLanguage: "uz",
};
