import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  editMessageInputSchema,
  messageContactGroupSchema,
  messageCursorInputSchema,
  messageLastReadSchema,
  messageSchema,
  sendMessageInputSchema,
  startThreadInputSchema,
  threadDetailSchema,
  threadListResponseSchema,
  unreadMessageCountSchema,
} from "../messages.js";

const threadPageInputSchema = z.object({
  threadId: uuidSchema,
  cursor: uuidSchema.optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const messagesContract = {
  contacts: oc
    .input(z.object({ centerId: uuidSchema.optional() }).optional())
    .output(z.array(messageContactGroupSchema)),
  threads: oc.input(messageCursorInputSchema).output(threadListResponseSchema),
  thread: oc.input(threadPageInputSchema).output(threadDetailSchema),
  startThread: oc.input(startThreadInputSchema).output(threadDetailSchema),
  send: oc
    .input(sendMessageInputSchema.extend({ threadId: uuidSchema }))
    .output(messageSchema),
  markRead: oc
    .input(z.object({ threadId: uuidSchema }))
    .output(messageLastReadSchema),
  editMessage: oc.input(editMessageInputSchema).output(messageSchema),
  deleteMessage: oc
    .input(z.object({ messageId: uuidSchema }))
    .output(messageSchema),
  unreadCount: oc.output(unreadMessageCountSchema),
};
