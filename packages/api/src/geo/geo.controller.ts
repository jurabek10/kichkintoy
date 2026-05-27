import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { GeoService } from "./geo.service";

@Controller("geo")
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get("regions")
  listRegions() {
    return this.geoService.listRegions();
  }

  @Get("regions/:regionId/districts")
  listDistricts(@Param("regionId", new ParseUUIDPipe()) regionId: string) {
    return this.geoService.listDistricts(regionId);
  }
}
