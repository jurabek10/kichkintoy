import { type ORPCImplementer, type ORPCDeps } from "../orpc/context";
import {
  centerSearchResponseSchema,
  centerSearchResultSchema,
} from "@kichkintoy/shared";

export function createCentersRouter(os: ORPCImplementer, deps: ORPCDeps) {
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
  };
}
