import { oc } from "@orpc/contract";
import {
  chatThreadDetailSchema,
  chatThreadIdInputSchema,
  chatThreadListResponseSchema,
  chatThreadSummarySchema,
  createChatThreadInputSchema,
  listChatThreadsInputSchema,
  renameChatThreadInputSchema,
} from "../chat.js";
import { successResponseSchema } from "./common.contract.js";

/**
 * Parent AI chatroom — thread management. The live answer turn is NOT here; it
 * streams over the SSE endpoint (POST /api/v1/parent/chat/stream). Every
 * procedure is scoped server-side to the authenticated parent.
 */
export const chatContract = {
  listThreads: oc
    .input(listChatThreadsInputSchema)
    .output(chatThreadListResponseSchema),
  createThread: oc
    .input(createChatThreadInputSchema)
    .output(chatThreadSummarySchema),
  getThread: oc
    .input(chatThreadIdInputSchema)
    .output(chatThreadDetailSchema),
  renameThread: oc
    .input(renameChatThreadInputSchema)
    .output(chatThreadSummarySchema),
  deleteThread: oc
    .input(chatThreadIdInputSchema)
    .output(successResponseSchema),
};
