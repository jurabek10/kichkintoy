import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createCalendarRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    staffList: os.calendar.staffList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.calendarService.listForStaff(user.id, {
        centerId: input.centerId,
        from: input.from,
        to: input.to,
        status: input.status,
      });
    }),
    parentList: os.calendar.parentList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.calendarService.listForParent(user.id, {
        centerId: input.centerId,
        childId: input.childId,
        from: input.from,
        to: input.to,
        status: input.status,
      });
    }),
    upcoming: os.calendar.upcoming.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.calendarService.upcoming(user.id, {
        centerId: input?.centerId,
        childId: input?.childId,
        limit: input?.limit,
      });
    }),
    detail: os.calendar.detail.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.calendarService.get(user.id, input.eventId);
    }),
    create: os.calendar.create.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.calendarService.create(user.id, input);
    }),
    update: os.calendar.update.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.calendarService.update(user.id, input);
    }),
    cancel: os.calendar.cancel.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.calendarService.cancel(user.id, input);
    }),
    markSeen: os.calendar.markSeen.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.calendarService.markSeen(user.id, input.eventId);
    }),
    publishDueReminders: os.calendar.publishDueReminders.handler(
      async ({ input, context }) => {
        await requireUser(deps.prisma, context.req);
        return deps.calendarService.publishDueReminders(
          input?.now ? new Date(input.now) : undefined,
        );
      },
    ),
  };
}
