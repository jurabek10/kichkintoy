import { z } from "zod";
import { appLanguageSchema } from "../lib/language.js";
import { facilityTypeSchema } from "../centers/facility-type.js";
import { uuidSchema } from "../lib/validators.js";

export const directorSetupModeValues = [
  "claim_existing",
  "create_new",
] as const;

export const directorSetupModeSchema = z.enum(directorSetupModeValues);
export type DirectorSetupMode = z.infer<typeof directorSetupModeSchema>;

export const directorClaimExistingPayloadSchema = z.object({
  centerId: uuidSchema,
});

export type DirectorClaimExistingPayload = z.infer<
  typeof directorClaimExistingPayloadSchema
>;

export const directorCreateNewPayloadSchema = z.object({
  facilityType: facilityTypeSchema,
  organizationName: z.string().trim().min(2),
  centerName: z.string().trim().min(2),
  regionId: uuidSchema,
  districtId: uuidSchema,
  address: z.string().trim().optional(),
  centerPhone: z.string().trim().optional(),
  defaultLanguage: appLanguageSchema.default("uz"),
});

export type DirectorCreateNewPayload = z.infer<
  typeof directorCreateNewPayloadSchema
>;

export const directorSetupPayloadSchema = z.object({
  mode: directorSetupModeSchema,
  claimExisting: directorClaimExistingPayloadSchema.optional(),
  createNew: directorCreateNewPayloadSchema.optional(),
});

export type DirectorSetupPayload = z.infer<typeof directorSetupPayloadSchema>;
