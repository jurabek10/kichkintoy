import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createMealsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    audience: os.meals.audience.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.audience(context.user.id, input.centerId);
    }),
    staffList: os.meals.staffList.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.listForStaff(context.user.id, input.centerId, {
        date: input.date,
        status: input.status,
        mealType: input.mealType,
      });
    }),
    parentList: os.meals.parentList.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.listForParent(
        context.user.id,
        input?.childId,
        input?.date,
      );
    }),
    detail: os.meals.detail.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.get(context.user.id, input.mealId);
    }),
    create: os.meals.create.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.create(context.user.id, input);
    }),
    update: os.meals.update.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.update(context.user.id, input.mealId, input.body);
    }),
    publish: os.meals.publish.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.publish(context.user.id, input.mealId);
    }),
    unpublish: os.meals.unpublish.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.unpublish(context.user.id, input.mealId);
    }),
    delete: os.meals.delete.use(access.authed).handler(async ({ input, context }) => {
      return deps.mealsService.delete(context.user.id, input.mealId);
    }),
    setChildStatuses: os.meals.setChildStatuses.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.mealsService.setChildStatuses(
          context.user.id,
          input.mealId,
          input.body.statuses,
        );
      },
    ),
  };
}
