import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

const MAX_RESULTS = 20;

export type CenterSearchInput = {
  regionId?: string;
  districtId?: string;
  q?: string;
  facilityType?: string;
};

@Injectable()
export class CentersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(input: CenterSearchInput) {
    // Suspended centers are hidden from signup search entirely (they also
    // block new join requests/invitations elsewhere).
    const filters: Prisma.CenterWhereInput[] = [
      { status: { not: "suspended" } },
    ];
    const query = (input.q ?? "").trim();

    if (input.regionId) {
      filters.push({ regionId: input.regionId });
    }

    if (input.districtId) {
      filters.push({ districtId: input.districtId });
    }

    if (input.facilityType) {
      filters.push({ facilityType: input.facilityType });
    }

    if (query.length >= 2) {
      filters.push({
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { centerCode: { contains: query, mode: "insensitive" } },
        ],
      });
    } else if (!input.regionId && !input.districtId) {
      return [];
    }

    const centers = await this.prisma.center.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: MAX_RESULTS,
      select: centerSearchSelect,
    });

    return centers.map(toCenterSearchResult);
  }

  async findByCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      throw new NotFoundException("Center not found.");
    }

    const center = await this.prisma.center.findUnique({
      where: { centerCode: trimmed },
      select: centerSearchSelect,
    });

    if (!center) {
      throw new NotFoundException("Center not found.");
    }

    return toCenterSearchResult(center);
  }

  async listClasses(centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, status: true },
    });

    if (!center) {
      throw new NotFoundException("Center not found.");
    }

    const classes = await this.prisma.class.findMany({
      where: { centerId, status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        ageGroup: true,
        academicYear: true,
      },
    });

    return classes;
  }
}

const centerSearchSelect = {
  id: true,
  name: true,
  centerCode: true,
  facilityType: true,
  phone: true,
  address: true,
  region: true,
  district: true,
  regionId: true,
  districtId: true,
  status: true,
} satisfies Prisma.CenterSelect;

function toCenterSearchResult(
  center: Prisma.CenterGetPayload<{ select: typeof centerSearchSelect }>,
) {
  return {
    id: center.id,
    name: center.name,
    centerCode: center.centerCode,
    facilityType: center.facilityType,
    phone: center.phone,
    address: center.address,
    region: center.region,
    district: center.district,
    regionId: center.regionId,
    districtId: center.districtId,
    status: center.status,
    selectable: center.status === "active",
  };
}
