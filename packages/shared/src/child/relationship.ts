import { z } from "zod";

export const relationshipTypeValues = [
  "mom",
  "dad",
  "grandmother",
  "grandfather",
  "uncle",
  "aunt",
  "brother",
  "sister",
  "guardian",
  "other",
] as const;

export const relationshipTypeSchema = z.enum(relationshipTypeValues);
export type RelationshipType = z.infer<typeof relationshipTypeSchema>;
