import { requireUser, type ORPCImplementer, type ORPCDeps } from "../context";
import {
  centerSearchResponseSchema,
  teacherClassesResponseSchema,
} from "@kichkintoy/shared";
import { centerSearchResultSchema } from "@kichkintoy/shared";

export function createGeoRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    regions: os.geo.regions.handler(() => deps.geoService.listRegions()),
    districts: os.geo.districts.handler(({ input }) =>
      deps.geoService.listDistricts(input.regionId),
    ),
  };
}

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

export function createTeacherRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    classes: os.teacher.classes.handler(async ({ context }) => {
      const user = await requireUser(deps.prisma, context.req);
      const rows = await deps.teacherService.listClasses(user.id);
      return teacherClassesResponseSchema.parse(rows);
    }),
    classChildren: os.teacher.classChildren.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.teacherService.listClassChildren(user.id, input.classId);
      },
    ),
  };
}
