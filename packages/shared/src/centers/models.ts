import { z } from "zod";
import { facilityTypeSchema } from "./facility-type.js";
import { centerStatusSchema } from "./status.js";
import { uuidSchema } from "../lib/validators.js";

export const centerSearchResultSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  centerCode: z.string(),
  facilityType: facilityTypeSchema,
  phone: z.string().nullable(),
  address: z.string().nullable(),
  region: z.string().nullable(),
  district: z.string().nullable(),
  regionId: uuidSchema.nullable(),
  districtId: uuidSchema.nullable(),
  status: centerStatusSchema,
  selectable: z.boolean(),
});

export type CenterSearchResult = z.infer<typeof centerSearchResultSchema>;

export const centerClassSummarySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  ageGroup: z.string().nullable(),
  academicYear: z.string().nullable(),
});

export type CenterClassSummary = z.infer<typeof centerClassSummarySchema>;

export const centerSelectionPayloadSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema.optional(),
});

export type CenterSelectionPayload = z.infer<
  typeof centerSelectionPayloadSchema
>;
