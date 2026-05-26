import { z } from "zod";

export const appConfigSchema = z.object({
  name: z.literal("Kichkintoy"),
  defaultLanguage: z.enum(["uz", "ru"]),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig: AppConfig = {
  name: "Kichkintoy",
  defaultLanguage: "uz",
};

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const userRoleValues = ["director", "parent", "teacher"] as const;
export const userRoleSchema = z.enum(userRoleValues);
export type UserRole = z.infer<typeof userRoleSchema>;

export const childGenderValues = ["boy", "girl", "prefer_not_to_say"] as const;
export const childGenderSchema = z.enum(childGenderValues);
export type ChildGender = z.infer<typeof childGenderSchema>;

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
