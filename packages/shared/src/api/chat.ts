import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

/** Languages the parent chatroom understands and replies in. */
export const chatLanguageValues = ["uz", "ru", "en"] as const;
export const chatLanguageSchema = z.enum(chatLanguageValues);
export type ChatLanguage = z.infer<typeof chatLanguageSchema>;

export const chatRoleValues = ["user", "assistant"] as const;
export const chatRoleSchema = z.enum(chatRoleValues);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const chatMessageSchema = z.object({
  id: uuidSchema,
  role: chatRoleSchema,
  content: z.string(),
  language: chatLanguageSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatThreadSummarySchema = z.object({
  id: uuidSchema,
  title: z.string(),
  childId: uuidSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type ChatThreadSummary = z.infer<typeof chatThreadSummarySchema>;

export const chatThreadDetailSchema = chatThreadSummarySchema.extend({
  messages: z.array(chatMessageSchema),
});
export type ChatThreadDetail = z.infer<typeof chatThreadDetailSchema>;

// --- Inputs ---

export const listChatThreadsInputSchema = z
  .object({
    cursor: uuidSchema.optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .optional();
export type ListChatThreadsInput = z.infer<typeof listChatThreadsInputSchema>;

export const chatThreadListResponseSchema = z.object({
  items: z.array(chatThreadSummarySchema),
  nextCursor: uuidSchema.nullable(),
});
export type ChatThreadListResponse = z.infer<
  typeof chatThreadListResponseSchema
>;

export const createChatThreadInputSchema = z.object({
  childId: uuidSchema.optional(),
});
export type CreateChatThreadInput = z.infer<
  typeof createChatThreadInputSchema
>;

export const chatThreadIdInputSchema = z.object({ threadId: uuidSchema });
export type ChatThreadIdInput = z.infer<typeof chatThreadIdInputSchema>;

export const renameChatThreadInputSchema = chatThreadIdInputSchema.extend({
  title: z.string().trim().min(1).max(120),
});
export type RenameChatThreadInput = z.infer<
  typeof renameChatThreadInputSchema
>;

/**
 * Body for the SSE streaming endpoint (POST /api/v1/parent/chat/stream).
 * Not an oRPC procedure — the live answer streams tokens over SSE.
 */
export const sendChatMessageInputSchema = z.object({
  threadId: uuidSchema,
  message: z.string().trim().min(1).max(2000),
  childId: uuidSchema.optional(),
});
export type SendChatMessageInput = z.infer<typeof sendChatMessageInputSchema>;
