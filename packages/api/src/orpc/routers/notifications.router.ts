import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createNotificationsRouter(
  os: ORPCImplementer,
  deps: ORPCDeps,
) {
  return {
    list: os.notifications.list.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.notificationsQueryService.list(user.id, {
        limit: input?.limit,
        cursor: input?.cursor,
        unreadOnly: input?.unreadOnly,
      });
    }),
    unreadCount: os.notifications.unreadCount.handler(async ({ context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.notificationsQueryService.unreadCount(user.id);
    }),
    markRead: os.notifications.markRead.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.notificationsQueryService.markRead(
        user.id,
        input.notificationId,
      );
    }),
    markAllRead: os.notifications.markAllRead.handler(async ({ context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.notificationsQueryService.markAllRead(user.id);
    }),
  };
}
