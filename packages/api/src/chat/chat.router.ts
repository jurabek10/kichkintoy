import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createChatRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    listThreads: os.chat.listThreads.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.listThreads(
          context.user.id,
          input?.cursor,
          input?.limit,
        );
      },
    ),
    createThread: os.chat.createThread.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.createThread(context.user.id, input.childId);
      },
    ),
    getThread: os.chat.getThread.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.getThread(context.user.id, input.threadId);
      },
    ),
    renameThread: os.chat.renameThread.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.renameThread(
          context.user.id,
          input.threadId,
          input.title,
        );
      },
    ),
    deleteThread: os.chat.deleteThread.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.deleteThread(context.user.id, input.threadId);
      },
    ),
  };
}
