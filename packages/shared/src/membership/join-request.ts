import { z } from "zod";

export const joinRequestKindValues = ["parent", "teacher", "director"] as const;
export const joinRequestKindSchema = z.enum(joinRequestKindValues);
export type JoinRequestKind = z.infer<typeof joinRequestKindSchema>;

export const joinRequestStatusValues = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const joinRequestStatusSchema = z.enum(joinRequestStatusValues);
export type JoinRequestStatus = z.infer<typeof joinRequestStatusSchema>;
