import { z } from "zod";
import { uuidSchema } from "../lib/validators.js";

export const districtSchema = z.object({
  id: uuidSchema,
  regionId: uuidSchema,
  name: z.string(),
  slug: z.string(),
  displayOrder: z.number().int(),
});

export type District = z.infer<typeof districtSchema>;
