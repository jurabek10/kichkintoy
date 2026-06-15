import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createCalendarRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    staffList: os.calendar.staffList.use(access.authed).handler(async ({ input, context }) => {
      return deps.calendarService.listForStaff(context.user.id, {
        centerId: input.centerId,
        from: input.from,
        to: input.to,
        status: input.status,
      });
    }),
    parentList: os.calendar.parentList.use(access.authed).handler(async ({ input, context }) => {
      return deps.calendarService.listForParent(context.user.id, {
        centerId: input.centerId,
        childId: input.childId,
        from: input.from,
        to: input.to,
        status: input.status,
      });
    }),
    upcoming: os.calendar.upcoming.use(access.authed).handler(async ({ input, context }) => {
      return deps.calendarService.upcoming(context.user.id, {
        centerId: input?.centerId,
        childId: input?.childId,
        limit: input?.limit,
      });
    }),
    detail: os.calendar.detail.use(access.authed).handler(async ({ input, context }) => {
      return deps.calendarService.get(context.user.id, input.eventId);
    }),
    create: os.calendar.create.use(access.authed).handler(async ({ input, context }) => {
      return deps.calendarService.create(context.user.id, input);
    }),
    update: os.calendar.update.use(access.authed).handler(async ({ input, context }) => {
      return deps.calendarService.update(context.user.id, input);
    }),
    cancel: os.calendar.cancel.use(access.authed).handler(async ({ input, context }) => {
      return deps.calendarService.cancel(context.user.id, input);
    }),
    markSeen: os.calendar.markSeen.use(access.authed).handler(async ({ input, context }) => {
      return deps.calendarService.markSeen(context.user.id, input.eventId);
    }),
    publishDueReminders: os.calendar.publishDueReminders.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.calendarService.publishDueReminders(
          input?.now ? new Date(input.now) : undefined,
        );
      },
    ),
  };
}
