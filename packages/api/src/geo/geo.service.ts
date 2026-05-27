import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  async listRegions() {
    return this.prisma.region.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        countryCode: true,
        displayOrder: true,
      },
    });
  }

  async listDistricts(regionId: string) {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true },
    });

    if (!region) {
      throw new NotFoundException("Region not found.");
    }

    return this.prisma.district.findMany({
      where: { regionId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        regionId: true,
        name: true,
        slug: true,
        displayOrder: true,
      },
    });
  }
}
