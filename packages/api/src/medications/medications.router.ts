import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createMedicationsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    children: os.medications.children.use(access.authed).handler(async ({ input, context }) => {
      return deps.medicationsService.children(context.user.id, input?.centerId);
    }),
    parentList: os.medications.parentList.use(access.authed).handler(async ({ input, context }) => {
      return deps.medicationsService.listForParent(context.user.id, {
        childId: input?.childId,
        date: input?.date,
        status: input?.status,
      });
    }),
    staffList: os.medications.staffList.use(access.authed).handler(async ({ input, context }) => {
      return deps.medicationsService.listForStaff(context.user.id, input.centerId, {
        date: input.date,
        status: input.status,
      });
    }),
    detail: os.medications.detail.use(access.authed).handler(async ({ input, context }) => {
      return deps.medicationsService.get(context.user.id, input.requestId);
    }),
    create: os.medications.create.use(access.authed).handler(async ({ input, context }) => {
      return deps.medicationsService.create(context.user.id, input);
    }),
    cancel: os.medications.cancel.use(access.authed).handler(async ({ input, context }) => {
      return deps.medicationsService.cancel(context.user.id, input.requestId);
    }),
    complete: os.medications.complete.use(access.authed).handler(async ({ input, context }) => {
      return deps.medicationsService.complete(
        context.user.id,
        input.requestId,
        input.body,
      );
    }),
    latestForChild: os.medications.latestForChild.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.medicationsService.latestForChild(context.user.id, input.childId);
      },
    ),
  };
}
