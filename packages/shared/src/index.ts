import { z } from "zod";

export const appConfigSchema = z.object({
  name: z.literal("Kichkintoy"),
  defaultLanguage: z.enum(["uz", "ru"])
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig: AppConfig = {
  name: "Kichkintoy",
  defaultLanguage: "uz"
};

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string().datetime()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
