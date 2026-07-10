import { type ORPCImplementer, type ORPCDeps } from "../orpc/context";
import { createAccess } from "../orpc/access";
import {
  centerSearchResponseSchema,
  centerSearchResultSchema,
} from "@kichkintoy/shared";
import { requestChildJoinSchema } from "../auth/auth.schemas";

export function createCentersRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    search: os.centers.search.handler(({ input }) =>
      deps.centersService
        .search(input)
        .then((rows) => centerSearchResponseSchema.parse(rows)),
    ),
    byCode: os.centers.byCode.handler(({ input }) =>
      deps.centersService
        .findByCode(input.code)
        .then((center) => centerSearchResultSchema.parse(center)),
    ),
    classes: os.centers.classes.handler(({ input }) =>
      deps.centersService.listClasses(input.centerId),
    ),
    requestChildJoin: os.centers.requestChildJoin
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.authService.requestChildJoin(
          context.user.id,
          requestChildJoinSchema.parse(input),
        ),
      ),
  };
}
