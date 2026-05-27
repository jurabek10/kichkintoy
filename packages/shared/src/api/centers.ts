import { z } from "zod";
import {
  centerClassSummarySchema,
  centerSearchResultSchema,
} from "../centers/models.js";
import { facilityTypeSchema } from "../centers/facility-type.js";
import { uuidSchema } from "../lib/validators.js";

export const centerSearchQuerySchema = z.object({
  regionId: uuidSchema.optional(),
  districtId: uuidSchema.optional(),
  q: z.string().optional(),
  facilityType: facilityTypeSchema.optional(),
});

export type CenterSearchQuery = z.infer<typeof centerSearchQuerySchema>;

export const centerSearchResponseSchema = z.array(centerSearchResultSchema);
export type CenterSearchResponse = z.infer<typeof centerSearchResponseSchema>;

export const centerByCodeQuerySchema = z.object({
  code: z.string().trim().min(1),
});

export type CenterByCodeQuery = z.infer<typeof centerByCodeQuerySchema>;

export const centerClassesResponseSchema = z.array(centerClassSummarySchema);
export type CenterClassesResponse = z.infer<
  typeof centerClassesResponseSchema
>;
