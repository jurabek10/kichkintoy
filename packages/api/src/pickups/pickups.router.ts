import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createPickupsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    children: os.pickups.children.use(access.authed).handler(async ({ input, context }) => {
      return deps.pickupsService.children(context.user.id, input?.centerId);
    }),
    parentList: os.pickups.parentList.use(access.authed).handler(async ({ input, context }) => {
      return deps.pickupsService.listForParent(context.user.id, {
        childId: input?.childId,
        date: input?.date,
        status: input?.status,
      });
    }),
    staffList: os.pickups.staffList.use(access.authed).handler(async ({ input, context }) => {
      return deps.pickupsService.listForStaff(context.user.id, input.centerId, {
        date: input.date,
        from: input.from,
        to: input.to,
        status: input.status,
        classId: input.classId,
      });
    }),
    detail: os.pickups.detail.use(access.authed).handler(async ({ input, context }) => {
      return deps.pickupsService.get(context.user.id, input.noticeId);
    }),
    create: os.pickups.create.use(access.authed).handler(async ({ input, context }) => {
      return deps.pickupsService.create(context.user.id, input);
    }),
    update: os.pickups.update.use(access.authed).handler(async ({ input, context }) => {
      return deps.pickupsService.update(context.user.id, input.noticeId, input.body);
    }),
    cancel: os.pickups.cancel.use(access.authed).handler(async ({ input, context }) => {
      return deps.pickupsService.cancel(context.user.id, input.noticeId);
    }),
    acknowledge: os.pickups.acknowledge.use(access.authed).handler(async ({ input, context }) => {
      return deps.pickupsService.acknowledge(context.user.id, input.noticeId);
    }),
  };
}
