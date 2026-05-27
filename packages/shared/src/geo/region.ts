import { z } from "zod";
import { uuidSchema } from "../lib/validators";

export const regionSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  countryCode: z.string(),
  displayOrder: z.number().int(),
});

export type Region = z.infer<typeof regionSchema>;
