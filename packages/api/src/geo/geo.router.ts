import { type ORPCImplementer, type ORPCDeps } from "../orpc/context";

export function createGeoRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    regions: os.geo.regions.handler(() => deps.geoService.listRegions()),
    districts: os.geo.districts.handler(({ input }) =>
      deps.geoService.listDistricts(input.regionId),
    ),
  };
}
