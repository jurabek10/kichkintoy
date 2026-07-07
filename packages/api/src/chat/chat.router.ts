import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";
import type { ChatOwnerRole } from "./chat.service";

/**
 * Pick the widest scope the user legitimately holds: director (their center) >
 * teacher (her classes) > parent (their child).
 */
function ownerRoleFor(user: {
  roles: Array<{ name: string }>;
}): ChatOwnerRole {
  const names = new Set(user.roles.map((role) => role.name));
  if (names.has("director") || names.has("organization_owner")) return "director";
  if (names.has("teacher")) return "teacher";
  return "parent";
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
