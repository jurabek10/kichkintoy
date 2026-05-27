import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { CentersService } from "./centers.service";

@Controller("centers")
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Get("search")
  search(
    @Query("regionId") regionId?: string,
    @Query("districtId") districtId?: string,
    @Query("q") q?: string,
    @Query("facilityType") facilityType?: string,
  ) {
    return this.centersService.search({
      regionId: regionId?.trim() || undefined,
      districtId: districtId?.trim() || undefined,
      q: q?.trim() || undefined,
      facilityType: facilityType?.trim() || undefined,
    });
  }

  @Get("by-code")
  findByCode(@Query("code") code?: string) {
    if (!code) {
      throw new BadRequestException("Center code is required.");
    }
    return this.centersService.findByCode(code);
  }

  @Get(":centerId/classes")
  listClasses(@Param("centerId", new ParseUUIDPipe()) centerId: string) {
    return this.centersService.listClasses(centerId);
  }
}
