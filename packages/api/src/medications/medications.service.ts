import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  medicationAudienceResponseSchema,
  medicationListResponseSchema,
  medicationRequestDetailSchema,
  medicationStatusSchema,
  type CompleteMedicationRequestInput,
  type CreateMedicationRequestInput,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const medicationInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
  class: { select: { id: true, name: true } },
  child: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
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
  reviewedByUser: { select: { id: true, fullName: true } },
  administeredByUser: { select: { id: true, fullName: true } },
  photoMediaAsset: {
    select: { id: true, mediaType: true, mimeType: true },
  },
} satisfies Prisma.MedicationRequestInclude;

type MedicationPayload = Prisma.MedicationRequestGetPayload<{
  include: typeof medicationInclude;
}>;

@Injectable()
export class MedicationsService {
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
          child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          class: { select: { id: true, name: true } },
        },
        orderBy: { child: { firstName: "asc" } },
      });
      return medicationAudienceResponseSchema.parse({
        children: enrollments.map((enrollment) => ({
          id: enrollment.child.id,
          name: childName(enrollment.child),
          photoUrl: enrollment.child.photoUrl,
          centerId: enrollment.centerId,
          centerName: enrollment.center.name,
          classId: enrollment.classId,
          className: enrollment.class?.name ?? null,
        })),
      });
    }

    const access = await this.parentAccess(userId);
    return medicationAudienceResponseSchema.parse({
      children: access.enrollments
        .filter((enrollment) => (centerId ? enrollment.centerId === centerId : true))
        .map((enrollment) => ({
          id: enrollment.childId,
          name: enrollment.childName,
          photoUrl: enrollment.childPhotoUrl,
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
    const requests = await this.prisma.medicationRequest.findMany({
      where: {
        parentUserId: userId,
        childId: { in: access.childIds },
        ...(filters.date
          ? { requestedForDate: parseDate(filters.date) }
          : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: medicationInclude,
      orderBy: [{ requestedForDate: "desc" }, { createdAt: "desc" }],
    });
    return medicationListResponseSchema.parse(
      requests.map((request) => this.toSummary(request)),
    );
  }

  async listForStaff(
    userId: string,
    centerId: string,
    filters: { date?: string; from?: string; to?: string; status?: string } = {},
  ) {
    const scope = await this.requireStaffScope(userId, centerId);
    const requests = await this.prisma.medicationRequest.findMany({
      where: {
        centerId,
        ...dateWhere("requestedForDate", filters),
        ...(filters.status ? { status: filters.status } : {}),
        ...(scope.director ? {} : { classId: { in: scope.classIds } }),
      },
      include: medicationInclude,
      orderBy: [{ requestedForDate: "desc" }, { createdAt: "desc" }],
    });
    return medicationListResponseSchema.parse(
      requests.map((request) => this.toSummary(request)),
    );
  }

  async get(userId: string, requestId: string) {
    const request = await this.findRequest(requestId);
    if (!(await this.canView(userId, request))) {
      throw new ForbiddenException("You cannot access this medication request.");
    }
    return medicationRequestDetailSchema.parse(this.toDetail(request));
  }

  async latestForChild(userId: string, childId: string) {
    await this.parentAccess(userId, childId);
    const request = await this.prisma.medicationRequest.findFirst({
      where: { childId, parentUserId: userId },
      include: medicationInclude,
      orderBy: { createdAt: "desc" },
    });
    return request
      ? medicationRequestDetailSchema.parse(this.toDetail(request))
      : null;
  }

  async create(userId: string, input: CreateMedicationRequestInput) {
    const access = await this.parentAccess(userId, input.childId);
    const enrollment = access.enrollments.find(
      (item) => item.childId === input.childId,
    );
    if (!enrollment) {
      throw new ForbiddenException("You cannot create a request for this child.");
    }
    if (input.photoMediaAssetId) {
      await this.requireParentPhoto(
        userId,
        enrollment.centerId,
        input.photoMediaAssetId,
      );
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.medicationRequest.create({
        data: {
          centerId: enrollment.centerId,
          classId: enrollment.classId,
          childId: input.childId,
          parentUserId: userId,
          requestedForDate: parseDate(input.requestedForDate),
          symptoms: clean(input.symptoms),
          medicineName: clean(input.medicineName),
          medicationType: clean(input.medicationType),
          dosage: clean(input.dosage),
          medicationTime: clean(input.medicationTime),
          medicationCount: emptyToNull(input.medicationCount),
          storageMethod: emptyToNull(input.storageMethod),
          instructions: emptyToNull(input.instructions),
          specialNote: emptyToNull(input.specialNote),
          photoMediaAssetId: input.photoMediaAssetId ?? null,
          photoCaption: emptyToNull(input.photoCaption),
          parentSignature: clean(input.parentSignature),
          status: "pending",
        },
        include: medicationInclude,
      });
      await this.audit.log(
        {
          organizationId: created.center.organizationId,
          centerId: created.centerId,
          actorUserId: userId,
          action: "medication_request.created",
          entityType: "medication_request",
          entityId: created.id,
        },
        tx,
      );
      await this.notifyCreated(tx, created.id);
      return created;
    });
    return medicationRequestDetailSchema.parse(this.toDetail(request));
  }

  async cancel(userId: string, requestId: string) {
    const existing = await this.findRequest(requestId);
    if (existing.parentUserId !== userId) {
      throw new ForbiddenException("You cannot cancel this medication request.");
    }
    if (existing.status !== "pending") {
      throw new BadRequestException("Only pending requests can be cancelled.");
    }
    const request = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.medicationRequest.update({
        where: { id: requestId },
        data: { status: "cancelled" },
        include: medicationInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "medication_request.cancelled",
          entityType: "medication_request",
          entityId: updated.id,
        },
        tx,
      );
      return updated;
    });
    return medicationRequestDetailSchema.parse(this.toDetail(request));
  }

  async complete(
    userId: string,
    requestId: string,
    input: CompleteMedicationRequestInput,
  ) {
    const existing = await this.findRequest(requestId);
    await this.requireStaffManage(userId, existing);
    if (existing.status !== "pending") {
      throw new BadRequestException("Only pending requests can be completed.");
    }
    const administered = input.status === "administered";
    const completedAt = input.administeredAt
      ? new Date(input.administeredAt)
      : new Date();
    const request = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.medicationRequest.update({
        where: { id: requestId },
        data: {
          status: input.status,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          administeredByUserId: userId,
          administeredAt: administered ? completedAt : null,
          administeredDose: administered
            ? emptyToNull(input.administeredDose) ?? existing.dosage
            : null,
          staffNote: emptyToNull(input.staffNote),
          skippedReason: administered ? null : emptyToNull(input.skippedReason),
        },
        include: medicationInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: administered
            ? "medication_request.administered"
            : "medication_request.skipped",
          entityType: "medication_request",
          entityId: updated.id,
        },
        tx,
      );
      await this.notifyCompleted(tx, updated);
      return updated;
    });
    return medicationRequestDetailSchema.parse(this.toDetail(request));
  }

  async canAccessMedia(userId: string, mediaAssetId: string) {
    const request = await this.prisma.medicationRequest.findFirst({
      where: {
        OR: [
          { photoMediaAssetId: mediaAssetId },
          // The parent signature is stored as the string `media:<assetId>`.
          { parentSignature: `media:${mediaAssetId}` },
        ],
      },
      include: medicationInclude,
    });
    return request ? this.canView(userId, request) : false;
  }

  private async requireParentPhoto(
    userId: string,
    centerId: string,
    mediaAssetId: string,
  ) {
    const media = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      select: {
        id: true,
        centerId: true,
        uploaderUserId: true,
        mediaType: true,
      },
    });
    if (
      !media ||
      media.centerId !== centerId ||
      media.uploaderUserId !== userId ||
      media.mediaType !== "image"
    ) {
      throw new BadRequestException("Medication photo is invalid.");
    }
  }

  private async findRequest(requestId: string) {
    const request = await this.prisma.medicationRequest.findUnique({
      where: { id: requestId },
      include: medicationInclude,
    });
    if (!request) throw new NotFoundException("Medication request not found.");
    return request;
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
        "You cannot manage medication requests for this center.",
      );
    }
    return {
      director: false,
      classIds: assignments.map((item) => item.classId),
    };
  }

  private async requireStaffManage(userId: string, request: MedicationPayload) {
    const scope = await this.requireStaffScope(userId, request.centerId);
    if (scope.director) return;
    if (!request.classId || !scope.classIds.includes(request.classId)) {
      throw new ForbiddenException(
        "You cannot manage this medication request.",
      );
    }
  }

  private async canView(userId: string, request: MedicationPayload) {
    if (request.parentUserId === userId) return true;
    const scope = await this.requireStaffScope(userId, request.centerId).catch(
      () => null,
    );
    if (!scope) return false;
    if (scope.director) return true;
    return Boolean(request.classId && scope.classIds.includes(request.classId));
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
        childPhotoUrl: guardian.child.photoUrl,
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

  private async notifyCreated(tx: Tx, requestId: string) {
    const request = await tx.medicationRequest.findUnique({
      where: { id: requestId },
      include: {
        child: { select: { firstName: true, lastName: true } },
        center: { select: { organizationId: true } },
      },
    });
    if (!request) return;
    const directorRoles = await tx.userRole.findMany({
      where: {
        role: { name: { in: ["director", "organization_owner"] } },
        OR: [
          { centerId: request.centerId },
          {
            organizationId: request.center.organizationId,
            centerId: null,
          },
        ],
      },
      select: { userId: true },
    });
    const teacherAssignments = request.classId
      ? await tx.teacherClassAssignment.findMany({
          where: {
            classId: request.classId,
            endedAt: null,
          },
          select: { teacherUserId: true },
        })
      : [];
    const child = childName(request.child);
    await Promise.all(
      unique([
        ...directorRoles.map((item) => item.userId),
        ...teacherAssignments.map((item) => item.teacherUserId),
      ]).map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: "medication_request.created",
            title: "New medication request",
            body: `${child} has a medication request for ${toIsoDate(
              request.requestedForDate,
            )}.`,
            entityType: "medication_request",
            entityId: request.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private async notifyCompleted(tx: Tx, request: MedicationPayload) {
    const child = childName(request.child);
    await this.notifications.enqueue(
      {
        userId: request.parentUserId,
        notificationType:
          request.status === "administered"
            ? "medication_request.administered"
            : "medication_request.skipped",
        title:
          request.status === "administered"
            ? "Medication administered"
            : "Medication skipped",
        body:
          request.status === "administered"
            ? `${child}'s medication was administered.`
            : `${child}'s medication was not administered. Please check the note.`,
        entityType: "medication_request",
        entityId: request.id,
        channels: ["in_app", "push"],
      },
      tx,
    );
  }

  private toSummary(request: MedicationPayload) {
    return {
      id: request.id,
      centerId: request.centerId,
      centerName: request.center.name,
      child: toChild(request),
      parentUserId: request.parentUserId,
      parentName: request.parentUser.fullName,
      requestedForDate: toIsoDate(request.requestedForDate),
      symptoms: request.symptoms,
      medicineName: request.medicineName,
      medicationType: request.medicationType,
      dosage: request.dosage,
      medicationTime: request.medicationTime,
      medicationCount: request.medicationCount,
      status: medicationStatusSchema.parse(request.status),
      photo: request.photoMediaAsset
        ? {
            assetId: request.photoMediaAsset.id,
            mediaType: request.photoMediaAsset.mediaType,
            mimeType: request.photoMediaAsset.mimeType,
          }
        : null,
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      administeredAt: request.administeredAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private toDetail(request: MedicationPayload) {
    return {
      ...this.toSummary(request),
      instructions: request.instructions,
      storageMethod: request.storageMethod,
      specialNote: request.specialNote,
      photoCaption: request.photoCaption,
      parentSignature: request.parentSignature,
      reviewedBy: request.reviewedByUser,
      administeredBy: request.administeredByUser,
      administeredDose: request.administeredDose,
      staffNote: request.staffNote,
      skippedReason: request.skippedReason,
    };
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

function toChild(request: MedicationPayload) {
  const enrollment = request.child.childEnrollments[0];
  return {
    id: request.child.id,
    name: childName(request.child),
    photoUrl: request.child.photoUrl,
    centerId: request.centerId,
    centerName: request.center.name,
    classId: request.classId ?? enrollment?.classId ?? null,
    className: request.class?.name ?? enrollment?.class?.name ?? null,
  };
}
