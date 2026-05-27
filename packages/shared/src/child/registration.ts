import { z } from "zod";
import { childGenderSchema } from "./gender";
import { relationshipTypeSchema } from "./relationship";
import { isoDateSchema } from "../lib/validators";

/** Child payload sent during parent signup or invitation acceptance. */
export const childRegistrationPayloadSchema = z.object({
  name: z.string().trim().min(1),
  image: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  dateOfBirth: isoDateSchema,
  gender: childGenderSchema,
  relationshipType: relationshipTypeSchema,
  customRelationshipLabel: z.string().trim().optional(),
});

export type ChildRegistrationPayload = z.infer<
  typeof childRegistrationPayloadSchema
>;
