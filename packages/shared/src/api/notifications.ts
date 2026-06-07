import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const notificationPriorityValues = ["normal", "high", "urgent"] as const;
export const notificationPrioritySchema = z.enum(notificationPriorityValues);
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>;

export const notificationMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
]);
export type NotificationMetadataValue = z.infer<
  typeof notificationMetadataValueSchema
>;

export const notificationMetadataSchema = z
  .record(z.string(), notificationMetadataValueSchema)
  .nullable();

export const notificationSummarySchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  notificationType: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: uuidSchema.nullable(),
  channel: z.literal("in_app"),
  status: z.string(),
  priority: notificationPrioritySchema,
  metadata: notificationMetadataSchema,
  sentAt: isoDateTimeSchema.nullable(),
  readAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type NotificationSummary = z.infer<typeof notificationSummarySchema>;

export const notificationListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(50).optional(),
    cursor: isoDateTimeSchema.optional(),
    unreadOnly: z.boolean().optional(),
  })
  .optional();

export const notificationListResponseSchema = z.object({
  items: z.array(notificationSummarySchema),
  nextCursor: isoDateTimeSchema.nullable(),
});
export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>;

export const notificationUnreadCountResponseSchema = z.object({
  count: z.number().int().min(0),
});
export type NotificationUnreadCountResponse = z.infer<
  typeof notificationUnreadCountResponseSchema
>;

export const markNotificationReadInputSchema = z.object({
  notificationId: uuidSchema,
});
