import { z } from "zod";

export const centerStatusValues = [
  "active",
  "inactive",
  "pending_verification",
] as const;

export const centerStatusSchema = z.enum(centerStatusValues);
export type CenterStatus = z.infer<typeof centerStatusSchema>;
