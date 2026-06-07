import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";
import { notificationPrioritySchema } from "./notifications.js";

export const realtimeQueryInvalidationHintSchema = z.object({
  group: z.string().min(1),
  id: z.string().min(1).optional(),
});
export type RealtimeQueryInvalidationHint = z.infer<
  typeof realtimeQueryInvalidationHintSchema
>;

export const createRealtimeTicketResponseSchema = z.object({
  ticket: z.string().min(32),
  expiresAt: isoDateTimeSchema,
  wsUrl: z.string().url(),
});
export type CreateRealtimeTicketResponse = z.infer<
  typeof createRealtimeTicketResponseSchema
>;

export const realtimeConnectionReadyMessageSchema = z.object({
  type: z.literal("connection.ready"),
  payload: z.object({
    connectedAt: isoDateTimeSchema,
  }),
});

export const realtimeNotificationCreatedMessageSchema = z.object({
  type: z.literal("notification.created"),
  payload: z.object({
    notificationId: uuidSchema,
    notificationType: z.string(),
    title: z.string(),
    body: z.string().nullable(),
    entityType: z.string().nullable(),
    entityId: uuidSchema.nullable(),
    priority: notificationPrioritySchema,
    createdAt: isoDateTimeSchema,
    queryKeys: z.array(realtimeQueryInvalidationHintSchema),
  }),
});

export const realtimeNotificationCountUpdatedMessageSchema = z.object({
  type: z.literal("notification.count_updated"),
  payload: z.object({
    unreadCount: z.number().int().min(0),
  }),
});

export const realtimeErrorMessageSchema = z.object({
  type: z.literal("error"),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const serverRealtimeMessageSchema = z.discriminatedUnion("type", [
  realtimeConnectionReadyMessageSchema,
  realtimeNotificationCreatedMessageSchema,
  realtimeNotificationCountUpdatedMessageSchema,
  realtimeErrorMessageSchema,
]);
export type ServerRealtimeMessage = z.infer<typeof serverRealtimeMessageSchema>;
