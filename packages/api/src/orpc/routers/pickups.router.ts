import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createPickupsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    children: os.pickups.children.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.pickupsService.children(user.id, input?.centerId);
    }),
    parentList: os.pickups.parentList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.pickupsService.listForParent(user.id, {
        childId: input?.childId,
        date: input?.date,
        status: input?.status,
      });
    }),
    staffList: os.pickups.staffList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.pickupsService.listForStaff(user.id, input.centerId, {
        date: input.date,
        status: input.status,
        classId: input.classId,
      });
    }),
    detail: os.pickups.detail.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.pickupsService.get(user.id, input.noticeId);
    }),
    create: os.pickups.create.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.pickupsService.create(user.id, input);
    }),
    update: os.pickups.update.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.pickupsService.update(user.id, input.noticeId, input.body);
    }),
    cancel: os.pickups.cancel.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.pickupsService.cancel(user.id, input.noticeId);
    }),
    acknowledge: os.pickups.acknowledge.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.pickupsService.acknowledge(user.id, input.noticeId);
    }),
  };
}
