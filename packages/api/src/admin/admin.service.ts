import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";
import type {
  AdminCenterDetail,
  AdminCenterFields,
  AdminCenterRow,
  AdminOverviewStats,
} from "@kichkintoy/shared";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const INVITATION_LINK_BASE = "https://app.kichkintoy.uz/invite";
const DEFAULT_INVITATION_EXPIRES_DAYS = 14;

const directorUserSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

/**
 * Platform admin (founder) operations across all centers.
 *
 * Privacy rule: only business-level aggregates and director contact info leave
 * this service — child and teacher name lists are never selected.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async overviewStats(): Promise<AdminOverviewStats> {
    const [
      centersByStatus,
      children,
      teachers,
      classes,
      parents,
      byRegion,
      newest,
    ] = await Promise.all([
      this.prisma.center.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.childEnrollment.findMany({
        where: { enrollmentStatus: "active" },
        distinct: ["childId"],
        select: { childId: true },
      }),
      this.prisma.userRole.findMany({
        where: { role: { name: "teacher" }, centerId: { not: null } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.class.count({ where: { status: "active" } }),
      this.prisma.userRole.findMany({
        where: { role: { name: "parent" } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.center.groupBy({
        by: ["region"],
        _count: { _all: true },
        orderBy: { _count: { region: "desc" } },
      }),
      this.prisma.center.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          centerCode: true,
          region: true,
          district: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const totalCenters = centersByStatus.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );
    const countFor = (status: string) =>
      centersByStatus.find((row) => row.status === status)?._count._all ?? 0;

    const directorsByCenter = await this.directorsByCenter(
      newest.map((center) => center.id),
    );

    return {
      totals: {
        centers: totalCenters,
        children: children.length,
        teachers: teachers.length,
        classes,
        parents: parents.length,
      },
      centersByStatus: {
        active: countFor("active"),
        suspended: countFor("suspended"),
      },
      centersByRegion: byRegion.map((row) => ({
        region: row.region,
        count: row._count._all,
      })),
      newestCenters: newest.map((center) => ({
        id: center.id,
        name: center.name,
        centerCode: center.centerCode,
        region: center.region,
        district: center.district,
        status: center.status as AdminOverviewStats["newestCenters"][number]["status"],
        createdAt: center.createdAt.toISOString(),
        directorName: directorsByCenter.get(center.id)?.fullName ?? null,
      })),
    };
  }

  async listCenters(): Promise<AdminCenterRow[]> {
    const centers = await this.prisma.center.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        centerCode: true,
        facilityType: true,
        region: true,
        district: true,
        regionId: true,
        districtId: true,
        status: true,
        createdAt: true,
        monthlyTuitionUzs: true,
      },
    });

    const centerIds = centers.map((center) => center.id);

    const [enrollments, teacherRoles, classCounts, directors] =
      await Promise.all([
        this.prisma.childEnrollment.groupBy({
          by: ["centerId"],
          where: {
            centerId: { in: centerIds },
            enrollmentStatus: "active",
          },
          _count: { _all: true },
        }),
        this.prisma.userRole.findMany({
          where: {
            centerId: { in: centerIds },
            role: { name: "teacher" },
          },
          distinct: ["centerId", "userId"],
          select: { centerId: true },
        }),
        this.prisma.class.groupBy({
          by: ["centerId"],
          where: { centerId: { in: centerIds }, status: "active" },
          _count: { _all: true },
        }),
        this.directorsByCenter(centerIds),
      ]);

    const childCounts = new Map(
      enrollments.map((row) => [row.centerId, row._count._all]),
    );
    const teacherCounts = new Map<string, number>();
    for (const row of teacherRoles) {
      if (!row.centerId) continue;
      teacherCounts.set(row.centerId, (teacherCounts.get(row.centerId) ?? 0) + 1);
    }
    const classCountMap = new Map(
      classCounts.map((row) => [row.centerId, row._count._all]),
    );

    return centers.map((center) => ({
      id: center.id,
      name: center.name,
      centerCode: center.centerCode,
      facilityType: center.facilityType as AdminCenterRow["facilityType"],
      region: center.region,
      district: center.district,
      regionId: center.regionId,
      districtId: center.districtId,
      status: center.status as AdminCenterRow["status"],
      createdAt: center.createdAt.toISOString(),
      monthlyTuitionUzs: Number(center.monthlyTuitionUzs),
      director: directors.get(center.id) ?? null,
      counts: {
        children: childCounts.get(center.id) ?? 0,
        teachers: teacherCounts.get(center.id) ?? 0,
        classes: classCountMap.get(center.id) ?? 0,
      },
    }));
  }

  async getCenter(centerId: string): Promise<AdminCenterDetail> {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (!center) {
      throw new NotFoundException("Center not found.");
    }

    const [
      children,
      teachers,
      parents,
      classes,
      directors,
      invitations,
    ] = await Promise.all([
      this.prisma.childEnrollment.count({
        where: { centerId, enrollmentStatus: "active" },
      }),
      this.prisma.userRole.findMany({
        where: { centerId, role: { name: "teacher" } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.userRole.findMany({
        where: { centerId, role: { name: "parent" } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.class.findMany({
        where: { centerId, status: "active" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              teacherClassAssignments: { where: { endedAt: null } },
              childEnrollments: { where: { enrollmentStatus: "active" } },
            },
          },
        },
      }),
      this.directorsByCenter([centerId]),
      this.prisma.centerInvitation.findMany({
        where: { centerId, kind: "director" },
        orderBy: { createdAt: "desc" },
        include: {
          invitedByUser: { select: { id: true, fullName: true } },
          acceptedByUser: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return {
      id: center.id,
      name: center.name,
      centerCode: center.centerCode,
      facilityType: center.facilityType as AdminCenterDetail["facilityType"],
      phone: center.phone,
      address: center.address,
      region: center.region,
      district: center.district,
      regionId: center.regionId,
      districtId: center.districtId,
      status: center.status as AdminCenterDetail["status"],
      createdAt: center.createdAt.toISOString(),
      monthlyTuitionUzs: Number(center.monthlyTuitionUzs),
      organization: center.organization,
      director: directors.get(center.id) ?? null,
      stats: {
        children,
        teachers: teachers.length,
        classes: classes.length,
        parents: parents.length,
      },
      classes: classes.map((klass) => ({
        id: klass.id,
        name: klass.name,
        teacherCount: klass._count.teacherClassAssignments,
        childCount: klass._count.childEnrollments,
      })),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        phone: invitation.phone,
        status: deriveInvitationStatus(invitation),
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
        sentAt: invitation.sentAt?.toISOString() ?? null,
        acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
        revokedAt: invitation.revokedAt?.toISOString() ?? null,
        invitedBy: invitation.invitedByUser,
        acceptedBy: invitation.acceptedByUser,
      })),
    };
  }

  async createCenter(args: { actorUserId: string; input: AdminCenterFields }) {
    const { region, district } = await this.requireRegionDistrict(
      args.input.regionId,
      args.input.districtId,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // Same shape as the director self-signup: a fresh Organization owning a
      // single Center. The invited director later becomes its org owner.
      const organization = await tx.organization.create({
        data: { name: args.input.name.trim() },
      });

      const centerCode = await generateUniqueCenterCode(tx);
      const center = await tx.center.create({
        data: {
          organizationId: organization.id,
          name: args.input.name.trim(),
          centerCode,
          facilityType: args.input.facilityType,
          phone: args.input.phone?.trim() || null,
          address: args.input.address?.trim() || null,
          regionId: region.id,
          districtId: district.id,
          region: region.name,
          district: district.name,
          status: "active",
          monthlyTuitionUzs: args.input.monthlyTuitionUzs,
        },
      });

      await this.audit.log(
        {
          organizationId: organization.id,
          centerId: center.id,
          actorUserId: args.actorUserId,
          action: "center.created",
          entityType: "center",
          entityId: center.id,
          metadata: { source: "admin" },
        },
        tx,
      );

      return center;
    });

    return { id: result.id, centerCode: result.centerCode };
  }

  async updateCenter(args: {
    centerId: string;
    actorUserId: string;
    input: Partial<AdminCenterFields>;
  }) {
    const center = await this.prisma.center.findUnique({
      where: { id: args.centerId },
      select: { id: true, organizationId: true },
    });

    if (!center) {
      throw new NotFoundException("Center not found.");
    }

    const data: Prisma.CenterUpdateInput = {};

    if (args.input.name !== undefined) data.name = args.input.name.trim();
    if (args.input.facilityType !== undefined) {
      data.facilityType = args.input.facilityType;
    }
    if (args.input.address !== undefined) {
      data.address = args.input.address.trim() || null;
    }
    if (args.input.phone !== undefined) {
      data.phone = args.input.phone.trim() || null;
    }
    if (args.input.monthlyTuitionUzs !== undefined) {
      data.monthlyTuitionUzs = args.input.monthlyTuitionUzs;
    }

    if (args.input.regionId !== undefined || args.input.districtId !== undefined) {
      if (!args.input.regionId || !args.input.districtId) {
        throw new BadRequestException(
          "Region and district must be updated together.",
        );
      }
      const { region, district } = await this.requireRegionDistrict(
        args.input.regionId,
        args.input.districtId,
      );
      data.regionRef = { connect: { id: region.id } };
      data.districtRef = { connect: { id: district.id } };
      data.region = region.name;
      data.district = district.name;
    }

    await this.prisma.center.update({ where: { id: center.id }, data });

    await this.audit.log({
      organizationId: center.organizationId,
      centerId: center.id,
      actorUserId: args.actorUserId,
      action: "center.updated",
      entityType: "center",
      entityId: center.id,
      metadata: { fields: Object.keys(args.input) },
    });

    return { success: true };
  }

  async setCenterStatus(args: {
    centerId: string;
    actorUserId: string;
    status: "active" | "suspended";
  }) {
    const center = await this.prisma.center.findUnique({
      where: { id: args.centerId },
      select: { id: true, organizationId: true, status: true },
    });

    if (!center) {
      throw new NotFoundException("Center not found.");
    }

    if (center.status !== args.status) {
      await this.prisma.center.update({
        where: { id: center.id },
        data: { status: args.status },
      });

      await this.audit.log({
        organizationId: center.organizationId,
        centerId: center.id,
        actorUserId: args.actorUserId,
        action:
          args.status === "suspended" ? "center.suspended" : "center.activated",
        entityType: "center",
        entityId: center.id,
      });
    }

    return { id: center.id, status: args.status };
  }

  async createDirectorInvitation(args: {
    centerId: string;
    actorUserId: string;
    phone: string;
    expiresInDays?: number;
  }) {
    const center = await this.prisma.center.findUnique({
      where: { id: args.centerId },
      select: { id: true, name: true, organizationId: true, status: true },
    });

    if (!center) {
      throw new NotFoundException("Center not found.");
    }

    if (center.status === "suspended") {
      throw new BadRequestException(
        "Suspended centers cannot receive new invitations. Activate the center first.",
      );
    }

    const phone = normalizePhoneNumber(args.phone);
    const code = await this.generateUniqueInvitationCode();
    const expiresAt = new Date(
      Date.now() +
        (args.expiresInDays ?? DEFAULT_INVITATION_EXPIRES_DAYS) *
          24 *
          60 *
          60 *
          1000,
    );

    const invitation = await this.prisma.centerInvitation.create({
      data: {
        centerId: center.id,
        invitedByUserId: args.actorUserId,
        kind: "director",
        phone,
        code,
        expiresAt,
      },
    });

    const message = buildDirectorInvitationSms(center.name, code);
    const delivery = await this.notifications.deliverSms(phone, message);

    if (delivery.sent) {
      await this.prisma.centerInvitation.update({
        where: { id: invitation.id },
        data: { sentAt: new Date() },
      });
    }

    await this.audit.log({
      organizationId: center.organizationId,
      centerId: center.id,
      actorUserId: args.actorUserId,
      action: "invitation.director.created",
      entityType: "center_invitation",
      entityId: invitation.id,
      metadata: { phone },
    });

    return {
      id: invitation.id,
      phone: invitation.phone,
      expiresAt: invitation.expiresAt.toISOString(),
      sentAt: delivery.sent ? new Date().toISOString() : null,
      smsDelivered: delivery.sent,
    };
  }

  async resendDirectorInvitation(args: {
    invitationId: string;
    actorUserId: string;
  }) {
    const invitation = await this.requireDirectorInvitation(args.invitationId);

    if (invitation.acceptedAt) {
      throw new BadRequestException("This invitation was already accepted.");
    }

    if (invitation.revokedAt) {
      throw new BadRequestException("This invitation has been revoked.");
    }

    const expiresAt = new Date(
      Date.now() + DEFAULT_INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );
    const message = buildDirectorInvitationSms(
      invitation.center.name,
      invitation.code,
    );
    const delivery = await this.notifications.deliverSms(
      invitation.phone,
      message,
    );

    const updated = await this.prisma.centerInvitation.update({
      where: { id: invitation.id },
      data: {
        expiresAt,
        sentAt: delivery.sent ? new Date() : invitation.sentAt,
        declinedAt: null,
      },
    });

    await this.audit.log({
      centerId: invitation.centerId,
      actorUserId: args.actorUserId,
      action: "invitation.director.resent",
      entityType: "center_invitation",
      entityId: invitation.id,
    });

    return {
      id: updated.id,
      expiresAt: updated.expiresAt.toISOString(),
      sentAt: updated.sentAt?.toISOString() ?? null,
      smsDelivered: delivery.sent,
    };
  }

  async revokeDirectorInvitation(args: {
    invitationId: string;
    actorUserId: string;
  }) {
    const invitation = await this.requireDirectorInvitation(args.invitationId);

    if (invitation.acceptedAt) {
      throw new BadRequestException("Accepted invitations cannot be revoked.");
    }

    if (invitation.revokedAt) {
      return {
        id: invitation.id,
        revokedAt: invitation.revokedAt.toISOString(),
      };
    }

    const updated = await this.prisma.centerInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({
      centerId: invitation.centerId,
      actorUserId: args.actorUserId,
      action: "invitation.director.revoked",
      entityType: "center_invitation",
      entityId: invitation.id,
    });

    return {
      id: updated.id,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
    };
  }

  /** First director (by role creation date) per center, with contact info. */
  private async directorsByCenter(centerIds: string[]) {
    const map = new Map<
      string,
      {
        id: string;
        fullName: string;
        phone: string | null;
        email: string | null;
        avatarUrl: string | null;
      }
    >();

    if (centerIds.length === 0) return map;

    const roles = await this.prisma.userRole.findMany({
      where: {
        centerId: { in: centerIds },
        role: { name: "director" },
      },
      orderBy: { createdAt: "asc" },
      select: {
        centerId: true,
        user: { select: directorUserSelect },
      },
    });

    for (const row of roles) {
      if (!row.centerId || map.has(row.centerId)) continue;
      map.set(row.centerId, {
        id: row.user.id,
        fullName: row.user.fullName,
        phone: row.user.phone,
        email: row.user.email,
        avatarUrl: row.user.avatarUrl,
      });
    }

    return map;
  }

  private async requireRegionDistrict(regionId: string, districtId: string) {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
    });
    if (!region) {
      throw new BadRequestException("Region is invalid.");
    }

    const district = await this.prisma.district.findUnique({
      where: { id: districtId },
    });
    if (!district || district.regionId !== region.id) {
      throw new BadRequestException(
        "District does not belong to the selected region.",
      );
    }

    return { region, district };
  }

  private async requireDirectorInvitation(invitationId: string) {
    const invitation = await this.prisma.centerInvitation.findUnique({
      where: { id: invitationId },
      include: { center: { select: { name: true } } },
    });

    if (!invitation || invitation.kind !== "director") {
      throw new NotFoundException("Invitation not found.");
    }

    return invitation;
  }

  private async generateUniqueInvitationCode(attempt = 0): Promise<string> {
    if (attempt > 8) {
      throw new Error("Failed to generate a unique invitation code.");
    }

    const code = generateInvitationCode();
    const existing = await this.prisma.centerInvitation.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      return this.generateUniqueInvitationCode(attempt + 1);
    }

    return code;
  }
}

function deriveInvitationStatus(invitation: {
  acceptedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}) {
  if (invitation.acceptedAt) return "accepted" as const;
  if (invitation.revokedAt) return "revoked" as const;
  if (invitation.declinedAt) return "declined" as const;
  if (invitation.expiresAt.getTime() <= Date.now()) return "expired" as const;
  return "pending" as const;
}

function buildDirectorInvitationSms(centerName: string, code: string) {
  return `Kichkintoy: you are invited to lead ${centerName} as its director. Open the app to accept. ${INVITATION_LINK_BASE}/${code}`;
}

function normalizePhoneNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  return `${prefix}${trimmed.replace(/\D/g, "")}`;
}

const INVITATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInvitationCode() {
  const bytes = randomBytes(10);
  let code = "";
  for (let i = 0; i < bytes.length; i += 1) {
    code += INVITATION_CODE_ALPHABET[bytes[i] % INVITATION_CODE_ALPHABET.length];
  }
  return code;
}

const CENTER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRawCenterCode() {
  let raw = "";
  for (let i = 0; i < 4; i += 1) {
    raw += CENTER_CODE_ALPHABET[randomInt(0, CENTER_CODE_ALPHABET.length)];
  }
  return `KIC-${raw}`;
}

async function generateUniqueCenterCode(tx: Tx, attempt = 0): Promise<string> {
  if (attempt > 8) {
    throw new Error("Failed to generate a unique center code.");
  }

  const candidate = generateRawCenterCode();
  const existing = await tx.center.findUnique({
    where: { centerCode: candidate },
    select: { id: true },
  });

  if (existing) {
    return generateUniqueCenterCode(tx, attempt + 1);
  }

  return candidate;
}
