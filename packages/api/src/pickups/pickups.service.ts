import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  pickupAudienceResponseSchema,
  pickupNoticeDetailSchema,
  pickupNoticeListResponseSchema,
  pickupNoticeStatusSchema,
  pickupRelationshipSchema,
  type CreatePickupNoticeInput,
  type UpdatePickupNoticeBody,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const pickupInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
  class: { select: { id: true, name: true } },
  child: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      childEnrollments: {
        where: { enrollmentStatus: "active" },
        select: {
          classId: true,
          class: { select: { name: true } },
        },
        take: 1,
      },
    },
  },
  parentUser: { select: { id: true, fullName: true } },
  acknowledgedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.PickupTimeNoticeInclude;

type PickupPayload = Prisma.PickupTimeNoticeGetPayload<{
  include: typeof pickupInclude;
}>;

@Injectable()
export class PickupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async children(userId: string, centerId?: string) {
    const staffScope = centerId
      ? await this.requireStaffScope(userId, centerId).catch(() => null)
      : null;
    if (centerId && staffScope) {
      const enrollments = await this.prisma.childEnrollment.findMany({
        where: {
          centerId,
          enrollmentStatus: "active",
          ...(staffScope.director
            ? {}
            : { classId: { in: staffScope.classIds } }),
        },
        include: {
          center: { select: { name: true } },
          child: { select: { id: true, firstName: true, lastName: true } },
          class: { select: { id: true, name: true } },
        },
        orderBy: { child: { firstName: "asc" } },
      });
      return pickupAudienceResponseSchema.parse({
        children: enrollments.map((enrollment) => ({
          id: enrollment.child.id,
          name: childName(enrollment.child),
          centerId: enrollment.centerId,
          centerName: enrollment.center.name,
          classId: enrollment.classId,
          className: enrollment.class?.name ?? null,
        })),
      });
    }

    const access = await this.parentAccess(userId);
    return pickupAudienceResponseSchema.parse({
      children: access.enrollments
        .filter((enrollment) => (centerId ? enrollment.centerId === centerId : true))
        .map((enrollment) => ({
          id: enrollment.childId,
          name: enrollment.childName,
          centerId: enrollment.centerId,
          centerName: enrollment.centerName,
          classId: enrollment.classId,
          className: enrollment.className,
        })),
    });
  }

  async listForParent(
    userId: string,
    filters: { childId?: string; date?: string; status?: string } = {},
  ) {
    const access = await this.parentAccess(userId, filters.childId);
    const notices = await this.prisma.pickupTimeNotice.findMany({
      where: {
        parentUserId: userId,
        childId: { in: access.childIds },
        ...(filters.date ? { pickupDate: parseDate(filters.date) } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: pickupInclude,
      orderBy: [{ pickupDate: "desc" }, { pickupTime: "asc" }],
    });
    return pickupNoticeListResponseSchema.parse(
      notices.map((notice) => this.toSummary(notice)),
    );
  }

  async listForStaff(
    userId: string,
    centerId: string,
    filters: {
      date?: string;
      from?: string;
      to?: string;
      status?: string;
      classId?: string;
    } = {},
  ) {
    const scope = await this.requireStaffScope(userId, centerId);
    if (
      filters.classId &&
      !scope.director &&
      !scope.classIds.includes(filters.classId)
    ) {
      throw new ForbiddenException("You cannot view this class pickup list.");
    }
    const notices = await this.prisma.pickupTimeNotice.findMany({
      where: {
        centerId,
        ...dateWhere("pickupDate", filters),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.classId
          ? { classId: filters.classId }
          : scope.director
            ? {}
            : { classId: { in: scope.classIds } }),
      },
      include: pickupInclude,
      orderBy: [{ pickupDate: "desc" }, { pickupTime: "asc" }],
    });
    return pickupNoticeListResponseSchema.parse(
      notices.map((notice) => this.toSummary(notice)),
    );
  }

  async get(userId: string, noticeId: string) {
    const notice = await this.findNotice(noticeId);
    if (!(await this.canView(userId, notice))) {
      throw new ForbiddenException("You cannot access this pickup notice.");
    }
    return pickupNoticeDetailSchema.parse(this.toDetail(notice));
  }

  async create(userId: string, input: CreatePickupNoticeInput) {
    const access = await this.parentAccess(userId, input.childId);
    const enrollment = access.enrollments.find(
      (item) => item.childId === input.childId,
    );
    if (!enrollment) {
      throw new ForbiddenException("You cannot create a pickup notice for this child.");
    }
    const pickupDate = parseDate(input.pickupDate);
    const existing = await this.prisma.pickupTimeNotice.findFirst({
      where: {
        childId: input.childId,
        parentUserId: userId,
        pickupDate,
        status: { not: "cancelled" },
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        "An active pickup notice already exists for this child and date.",
      );
    }

    const notice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pickupTimeNotice.create({
        data: {
          centerId: enrollment.centerId,
          classId: enrollment.classId,
          childId: input.childId,
          parentUserId: userId,
          pickupDate,
          pickupTime: input.pickupTime,
          pickupPersonName: clean(input.pickupPersonName),
          relationship: input.relationship,
          note: emptyToNull(input.note),
          status: "submitted",
        },
        include: pickupInclude,
      });
      await this.audit.log(
        {
          organizationId: created.center.organizationId,
          centerId: created.centerId,
          actorUserId: userId,
          action: "pickup_notice.created",
          entityType: "pickup_time_notice",
          entityId: created.id,
        },
        tx,
      );
      await this.notifyStaff(tx, created, "created");
      return created;
    });
    return pickupNoticeDetailSchema.parse(this.toDetail(notice));
  }

  async update(
    userId: string,
    noticeId: string,
    input: UpdatePickupNoticeBody,
  ) {
    const existing = await this.findNotice(noticeId);
    this.requireParentOwner(userId, existing);
    if (existing.status === "cancelled") {
      throw new BadRequestException("Cancelled pickup notices cannot be changed.");
    }

    const notice = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.pickupTimeNotice.update({
        where: { id: noticeId },
        data: {
          ...(input.pickupDate ? { pickupDate: parseDate(input.pickupDate) } : {}),
          ...(input.pickupTime ? { pickupTime: input.pickupTime } : {}),
          ...(input.pickupPersonName
            ? { pickupPersonName: clean(input.pickupPersonName) }
            : {}),
          ...(input.relationship ? { relationship: input.relationship } : {}),
          ...(input.note !== undefined ? { note: emptyToNull(input.note) } : {}),
          status: "changed",
          acknowledgedById: null,
          acknowledgedAt: null,
        },
        include: pickupInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "pickup_notice.changed",
          entityType: "pickup_time_notice",
          entityId: updated.id,
        },
        tx,
      );
      await this.notifyStaff(tx, updated, "changed");
      return updated;
    });
    return pickupNoticeDetailSchema.parse(this.toDetail(notice));
  }

  async cancel(userId: string, noticeId: string) {
    const existing = await this.findNotice(noticeId);
    this.requireParentOwner(userId, existing);
    if (existing.status === "cancelled") {
      throw new BadRequestException("Pickup notice is already cancelled.");
    }

    const notice = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.pickupTimeNotice.update({
        where: { id: noticeId },
        data: { status: "cancelled", acknowledgedById: null, acknowledgedAt: null },
        include: pickupInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "pickup_notice.cancelled",
          entityType: "pickup_time_notice",
          entityId: updated.id,
        },
        tx,
      );
      await this.notifyStaff(tx, updated, "cancelled");
      return updated;
    });
    return pickupNoticeDetailSchema.parse(this.toDetail(notice));
  }

  async acknowledge(userId: string, noticeId: string) {
    const existing = await this.findNotice(noticeId);
    await this.requireStaffManage(userId, existing);
    if (!["submitted", "changed"].includes(existing.status)) {
      throw new BadRequestException(
        "Only submitted or changed pickup notices can be acknowledged.",
      );
    }

    const notice = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.pickupTimeNotice.update({
        where: { id: noticeId },
        data: {
          status: "acknowledged",
          acknowledgedById: userId,
          acknowledgedAt: new Date(),
        },
        include: pickupInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "pickup_notice.acknowledged",
          entityType: "pickup_time_notice",
          entityId: updated.id,
        },
        tx,
      );
      await this.notifyParentAcknowledged(tx, updated);
      return updated;
    });
    return pickupNoticeDetailSchema.parse(this.toDetail(notice));
  }

  private async findNotice(noticeId: string) {
    const notice = await this.prisma.pickupTimeNotice.findUnique({
      where: { id: noticeId },
      include: pickupInclude,
    });
    if (!notice) throw new NotFoundException("Pickup notice not found.");
    return notice;
  }

  private requireParentOwner(userId: string, notice: PickupPayload) {
    if (notice.parentUserId !== userId) {
      throw new ForbiddenException("You cannot change this pickup notice.");
    }
  }

  private async requireStaffScope(userId: string, centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, organizationId: true },
    });
    if (!center) throw new ForbiddenException("Center not found.");
    const director = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: { in: ["director", "organization_owner"] } },
        OR: [
          { centerId },
          { organizationId: center.organizationId, centerId: null },
        ],
      },
    });
    if (director) return { director: true, classIds: [] as string[] };
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: {
        teacherUserId: userId,
        endedAt: null,
        class: { centerId, status: "active" },
      },
      select: { classId: true },
    });
    if (assignments.length === 0) {
      throw new ForbiddenException(
        "You cannot manage pickup notices for this center.",
      );
    }
    return {
      director: false,
      classIds: assignments.map((item) => item.classId),
    };
  }

  private async requireStaffManage(userId: string, notice: PickupPayload) {
    const scope = await this.requireStaffScope(userId, notice.centerId);
    if (scope.director) return;
    if (!notice.classId || !scope.classIds.includes(notice.classId)) {
      throw new ForbiddenException("You cannot manage this pickup notice.");
    }
  }

  private async canView(userId: string, notice: PickupPayload) {
    if (notice.parentUserId === userId) return true;
    const scope = await this.requireStaffScope(userId, notice.centerId).catch(
      () => null,
    );
    if (!scope) return false;
    if (scope.director) return true;
    return Boolean(notice.classId && scope.classIds.includes(notice.classId));
  }

  private async parentAccess(userId: string, childId?: string) {
    const guardians = await this.prisma.childGuardian.findMany({
      where: { userId, ...(childId ? { childId } : {}) },
      include: {
        child: {
          include: {
            childEnrollments: {
              where: { enrollmentStatus: "active" },
              include: {
                center: { select: { name: true } },
                class: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (guardians.length === 0) {
      throw new ForbiddenException("No linked children found.");
    }
    const enrollments = guardians.flatMap((guardian) =>
      guardian.child.childEnrollments.map((enrollment) => ({
        childId: guardian.childId,
        childName: childName(guardian.child),
        centerId: enrollment.centerId,
        centerName: enrollment.center.name,
        classId: enrollment.classId,
        className: enrollment.class?.name ?? null,
      })),
    );
    if (childId && !enrollments.some((item) => item.childId === childId)) {
      throw new ForbiddenException("You cannot access this child.");
    }
    if (enrollments.length === 0) {
      throw new ForbiddenException("No active child enrollment found.");
    }
    return {
      childIds: unique(enrollments.map((item) => item.childId)),
      enrollments,
    };
  }

  private async notifyStaff(
    tx: Tx,
    notice: PickupPayload,
    event: "created" | "changed" | "cancelled",
  ) {
    const directorRoles = await tx.userRole.findMany({
      where: {
        role: { name: { in: ["director", "organization_owner"] } },
        OR: [
          { centerId: notice.centerId },
          {
            organizationId: notice.center.organizationId,
            centerId: null,
          },
        ],
      },
      select: { userId: true },
    });
    const teacherAssignments = notice.classId
      ? await tx.teacherClassAssignment.findMany({
          where: { classId: notice.classId, endedAt: null },
          select: { teacherUserId: true },
        })
      : [];
    const child = childName(notice.child);
    const title =
      event === "created"
        ? "New pickup notice"
        : event === "changed"
          ? "Pickup notice changed"
          : "Pickup notice cancelled";
    const body =
      event === "cancelled"
        ? `${child}'s pickup notice was cancelled.`
        : `${child} will be picked up at ${notice.pickupTime} by ${notice.pickupPersonName}.`;
    await Promise.all(
      unique([
        ...directorRoles.map((item) => item.userId),
        ...teacherAssignments.map((item) => item.teacherUserId),
      ]).map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: `pickup_notice.${event}`,
            title,
            body,
            entityType: "pickup_time_notice",
            entityId: notice.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private async notifyParentAcknowledged(tx: Tx, notice: PickupPayload) {
    const child = childName(notice.child);
    await this.notifications.enqueue(
      {
        userId: notice.parentUserId,
        notificationType: "pickup_notice.acknowledged",
        title: "Pickup notice confirmed",
        body: `The center confirmed ${child}'s pickup notice.`,
        entityType: "pickup_time_notice",
        entityId: notice.id,
        channels: ["in_app", "push"],
      },
      tx,
    );
  }

  private toSummary(notice: PickupPayload) {
    return {
      id: notice.id,
      centerId: notice.centerId,
      centerName: notice.center.name,
      child: toChild(notice),
      parentUserId: notice.parentUserId,
      parentName: notice.parentUser.fullName,
      pickupDate: toIsoDate(notice.pickupDate),
      pickupTime: notice.pickupTime,
      pickupPersonName: notice.pickupPersonName,
      relationship: pickupRelationshipSchema.parse(notice.relationship),
      note: notice.note,
      status: pickupNoticeStatusSchema.parse(notice.status),
      acknowledgedBy: notice.acknowledgedBy,
      acknowledgedAt: notice.acknowledgedAt?.toISOString() ?? null,
      createdAt: notice.createdAt.toISOString(),
      updatedAt: notice.updatedAt.toISOString(),
    };
  }

  private toDetail(notice: PickupPayload) {
    return this.toSummary(notice);
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function emptyToNull(value?: string | null) {
  const cleaned = clean(value);
  return cleaned ? cleaned : null;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

/** A single-day match, or an inclusive [from, to] range when both are given. */
function dateWhere(
  field: string,
  filters: { date?: string; from?: string; to?: string },
) {
  if (filters.from && filters.to) {
    return {
      [field]: { gte: parseDate(filters.from), lte: parseDate(filters.to) },
    };
  }
  if (filters.date) {
    return { [field]: parseDate(filters.date) };
  }
  return {};
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function childName(child: { firstName: string; lastName: string | null }) {
  return [child.firstName, child.lastName].filter(Boolean).join(" ");
}

function toChild(notice: PickupPayload) {
  const enrollment = notice.child.childEnrollments[0];
  return {
    id: notice.child.id,
    name: childName(notice.child),
    centerId: notice.centerId,
    centerName: notice.center.name,
    classId: notice.classId ?? enrollment?.classId ?? null,
    className: notice.class?.name ?? enrollment?.class?.name ?? null,
  };
}
