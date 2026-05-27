import { z } from "zod";
import { isoDateTimeSchema } from "../lib/validators";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: isoDateTimeSchema,
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
