import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createMealsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    audience: os.meals.audience.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.audience(user.id, input.centerId);
    }),
    staffList: os.meals.staffList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.listForStaff(user.id, input.centerId, {
        date: input.date,
        status: input.status,
        mealType: input.mealType,
      });
    }),
    parentList: os.meals.parentList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.listForParent(
        user.id,
        input?.childId,
        input?.date,
      );
    }),
    detail: os.meals.detail.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.get(user.id, input.mealId);
    }),
    create: os.meals.create.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.create(user.id, input);
    }),
    update: os.meals.update.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.update(user.id, input.mealId, input.body);
    }),
    publish: os.meals.publish.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.publish(user.id, input.mealId);
    }),
    unpublish: os.meals.unpublish.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.unpublish(user.id, input.mealId);
    }),
    delete: os.meals.delete.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.mealsService.delete(user.id, input.mealId);
    }),
    setChildStatuses: os.meals.setChildStatuses.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.mealsService.setChildStatuses(
          user.id,
          input.mealId,
          input.body.statuses,
        );
      },
    ),
  };
}
