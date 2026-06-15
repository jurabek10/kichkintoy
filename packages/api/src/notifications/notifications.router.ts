import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createNotificationsRouter(
  os: ORPCImplementer,
  deps: ORPCDeps,
) {
  const access = createAccess(os, deps);
  return {
    list: os.notifications.list.use(access.authed).handler(async ({ input, context }) => {
      return deps.notificationsQueryService.list(context.user.id, {
        limit: input?.limit,
        cursor: input?.cursor,
        unreadOnly: input?.unreadOnly,
      });
    }),
    unreadCount: os.notifications.unreadCount.use(access.authed).handler(async ({ context }) => {
      return deps.notificationsQueryService.unreadCount(context.user.id);
    }),
    markRead: os.notifications.markRead.use(access.authed).handler(async ({ input, context }) => {
      return deps.notificationsQueryService.markRead(
        context.user.id,
        input.notificationId,
      );
    }),
    markAllRead: os.notifications.markAllRead.use(access.authed).handler(async ({ context }) => {
      return deps.notificationsQueryService.markAllRead(context.user.id);
    }),
  };
}
