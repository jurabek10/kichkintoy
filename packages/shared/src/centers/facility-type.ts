import { z } from "zod";

export const facilityTypeValues = [
  "kindergarten",
  "daycare",
  "academy",
] as const;

export const facilityTypeSchema = z.enum(facilityTypeValues);
export type FacilityType = z.infer<typeof facilityTypeSchema>;
