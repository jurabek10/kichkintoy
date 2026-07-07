import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";
import type { ChatOwnerRole } from "./chat.service";

/** A teacher (even a dual parent+teacher) gets the teacher toolset; else parent. */
function ownerRoleFor(user: {
  roles: Array<{ name: string }>;
}): ChatOwnerRole {
  return user.roles.some((role) => role.name === "teacher")
    ? "teacher"
    : "parent";
}

export function createChatRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    listThreads: os.chat.listThreads.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.listThreads(
          context.user.id,
          ownerRoleFor(context.user),
          input?.cursor,
          input?.limit,
        );
      },
    ),
    createThread: os.chat.createThread.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.createThread(
          context.user.id,
          ownerRoleFor(context.user),
          input.childId,
        );
      },
    ),
    getThread: os.chat.getThread.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.getThread(
          context.user.id,
          ownerRoleFor(context.user),
          input.threadId,
        );
      },
    ),
    renameThread: os.chat.renameThread.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.renameThread(
          context.user.id,
          ownerRoleFor(context.user),
          input.threadId,
          input.title,
        );
      },
    ),
    deleteThread: os.chat.deleteThread.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.chatService.deleteThread(
          context.user.id,
          ownerRoleFor(context.user),
          input.threadId,
        );
      },
    ),
  };
}
