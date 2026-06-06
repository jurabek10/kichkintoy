import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createMedicationsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    children: os.medications.children.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.medicationsService.children(user.id, input?.centerId);
    }),
    parentList: os.medications.parentList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.medicationsService.listForParent(user.id, {
        childId: input?.childId,
        date: input?.date,
        status: input?.status,
      });
    }),
    staffList: os.medications.staffList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.medicationsService.listForStaff(user.id, input.centerId, {
        date: input.date,
        status: input.status,
      });
    }),
    detail: os.medications.detail.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.medicationsService.get(user.id, input.requestId);
    }),
    create: os.medications.create.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.medicationsService.create(user.id, input);
    }),
    cancel: os.medications.cancel.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.medicationsService.cancel(user.id, input.requestId);
    }),
    complete: os.medications.complete.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.medicationsService.complete(
        user.id,
        input.requestId,
        input.body,
      );
    }),
    latestForChild: os.medications.latestForChild.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.medicationsService.latestForChild(user.id, input.childId);
      },
    ),
  };
}
