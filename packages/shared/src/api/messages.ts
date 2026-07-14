import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const messageContactRoleValues = ["parent", "teacher", "director"] as const;
export const messageContactRoleSchema = z.enum(messageContactRoleValues);
export type MessageContactRole = z.infer<typeof messageContactRoleSchema>;

export const messageParentIdentityContextSchema = z.object({
  className: z.string().min(1),
  childName: z.string().min(1),
  relationship: z.string().min(1),
});
export type MessageParentIdentityContext = z.infer<
  typeof messageParentIdentityContextSchema
>;

export const messageContactSchema = z.object({
  userId: uuidSchema,
  displayName: z.string().min(1),
  photoMediaAssetId: uuidSchema.nullable(),
  photoUrl: z.string().nullable(),
  role: messageContactRoleSchema,
  parentContext: messageParentIdentityContextSchema.nullable(),
  classLabel: z.string().nullable(),
  centerId: uuidSchema,
});
export type MessageContact = z.infer<typeof messageContactSchema>;

export const messageContactGroupSchema = z.object({
  centerId: uuidSchema,
  centerName: z.string().min(1),
  label: z.string().min(1),
  contacts: z.array(messageContactSchema),
});
export type MessageContactGroup = z.infer<typeof messageContactGroupSchema>;

export const messageParticipantSchema = messageContactSchema.pick({
  userId: true,
  displayName: true,
  photoMediaAssetId: true,
  photoUrl: true,
  role: true,
  parentContext: true,
});
export type MessageParticipant = z.infer<typeof messageParticipantSchema>;

export const messageAttachmentSchema = z.object({
  mediaAssetId: uuidSchema,
  mediaType: z.enum(["image", "video", "file"]),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  thumbnailUrl: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
});
export type MessageAttachment = z.infer<typeof messageAttachmentSchema>;

export const messageSchema = z.object({
  id: uuidSchema,
  senderUserId: uuidSchema,
  body: z.string().nullable(),
  attachments: z.array(messageAttachmentSchema),
  deletedAt: isoDateTimeSchema.nullable(),
  editedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type DirectMessage = z.infer<typeof messageSchema>;

export const threadSummarySchema = z.object({
  threadId: uuidSchema,
  centerId: uuidSchema,
  otherParticipant: messageParticipantSchema,
  lastMessagePreview: z.string().nullable(),
  lastMessageKind: z.enum(["text", "image", "video", "file"]).nullable(),
  lastMessageAt: isoDateTimeSchema.nullable(),
  unreadCount: z.number().int().min(0),
  // When the other participant last read this thread. A message of mine is
  // "read" once its createdAt is at or before this — drives the read receipts.
  otherLastReadAt: isoDateTimeSchema.nullable(),
});
export type ThreadSummary = z.infer<typeof threadSummarySchema>;

export const sendMessageInputSchema = z
  .object({
    body: z.string().trim().max(2000).optional(),
    attachmentMediaAssetIds: z.array(uuidSchema).max(4).default([]),
  })
  .refine(
    (input) => Boolean(input.body) || input.attachmentMediaAssetIds.length > 0,
    { message: "A message needs text or at least one attachment." },
  );
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const startThreadInputSchema = z.intersection(
  sendMessageInputSchema,
  z.object({
    recipientUserId: uuidSchema,
    centerId: uuidSchema.optional(),
  }),
);
export type StartThreadInput = z.infer<typeof startThreadInputSchema>;

export const editMessageInputSchema = z.object({
  messageId: uuidSchema,
  body: z.string().trim().min(1).max(2000),
});
export type EditMessageInput = z.infer<typeof editMessageInputSchema>;

export const messageCursorInputSchema = z
  .object({
    cursor: uuidSchema.optional(),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .optional();

export const threadListResponseSchema = z.object({
  items: z.array(threadSummarySchema),
  nextCursor: uuidSchema.nullable(),
});
export type ThreadListResponse = z.infer<typeof threadListResponseSchema>;

export const threadDetailSchema = z.object({
  thread: threadSummarySchema,
  messages: z.array(messageSchema),
  nextCursor: uuidSchema.nullable(),
});
export type ThreadDetail = z.infer<typeof threadDetailSchema>;

export const unreadMessageCountSchema = z.object({
  total: z.number().int().min(0),
});

export const messageLastReadSchema = z.object({
  lastReadAt: isoDateTimeSchema,
});
