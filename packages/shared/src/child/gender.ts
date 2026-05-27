import { z } from "zod";

export const childGenderValues = ["boy", "girl", "prefer_not_to_say"] as const;
export const childGenderSchema = z.enum(childGenderValues);
export type ChildGender = z.infer<typeof childGenderSchema>;
