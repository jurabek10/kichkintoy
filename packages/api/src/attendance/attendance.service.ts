import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  attendanceChildrenResponseSchema,
  attendanceDetailSchema,
  attendanceStatusSchema,
  parentAttendanceListResponseSchema,
  staffAttendanceListResponseSchema,
  type AttendanceRecordSummary,
  type AttendanceStatus,
  type MarkAttendanceStatusInput,
  type ParentSubmitAttendanceAbsenceInput,
  type RecordAttendanceCheckInInput,
  type RecordAttendanceCheckOutInput,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const attendanceInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
  class: { select: { id: true, name: true } },
  child: { select: { id: true, firstName: true, lastName: true } },
  checkInByUser: { select: { id: true, fullName: true } },
  checkOutByUser: { select: { id: true, fullName: true } },
} satisfies Prisma.AttendanceRecordInclude;

type AttendancePayload = Prisma.AttendanceRecordGetPayload<{
  include: typeof attendanceInclude;
}>;

type EnrollmentSummary = {
  childId: string;
  childName: string;
  centerId: string;
  centerName: string;
  organizationId: string;
  classId: string | null;
  className: string | null;
};

@Injectable()
export class AttendanceService {
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
      const enrollments = await this.listStaffEnrollments(centerId, staffScope);
      return attendanceChildrenResponseSchema.parse({
        children: enrollments.map((enrollment) => ({
          id: enrollment.childId,
          name: enrollment.childName,
          centerId: enrollment.centerId,
          centerName: enrollment.centerName,
          classId: enrollment.classId,
          className: enrollment.className,
        })),
      });
    }

    const access = await this.parentAccess(userId);
    return attendanceChildrenResponseSchema.parse({
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

  async listForStaff(
    userId: string,
    centerId: string,
    filters: { date?: string; classId?: string; status?: AttendanceStatus } = {},
  ) {
    const scope = await this.requireStaffScope(userId, centerId);
    if (
      filters.classId &&
      !scope.director &&
      !scope.classIds.includes(filters.classId)
    ) {
      throw new ForbiddenException("You cannot view this class attendance.");
    }

    const attendanceDate = parseDate(filters.date ?? todayIso());
    const enrollments = await this.listStaffEnrollments(centerId, scope, {
      classId: filters.classId,
    });
    const childIds = enrollments.map((enrollment) => enrollment.childId);
    const rows = childIds.length
      ? await this.prisma.attendanceRecord.findMany({
          where: {
            childId: { in: childIds },
            attendanceDate,
          },
          include: attendanceInclude,
        })
      : [];
    const byChild = new Map(rows.map((row) => [row.childId, row]));
    const summaries = enrollments.map((enrollment) => {
      const row = byChild.get(enrollment.childId);
      return row
        ? this.toSummary(row)
        : this.emptySummary(enrollment, attendanceDate);
    });
    const filtered = filters.status
      ? summaries.filter((item) => item.status === filters.status)
      : summaries;

    return staffAttendanceListResponseSchema.parse({
      summary: summarize(summaries),
      records: filtered,
    });
  }

  async listForParent(
    userId: string,
    filters: { childId?: string; from?: string; to?: string } = {},
  ) {
    const access = await this.parentAccess(userId, filters.childId);
    const from = parseDate(filters.from ?? todayIso());
    const to = parseDate(filters.to ?? filters.from ?? todayIso());
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        childId: { in: access.childIds },
        attendanceDate: { gte: from, lte: to },
      },
      include: attendanceInclude,
      orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
    });

    return parentAttendanceListResponseSchema.parse(
      rows.map((row) => this.toSummary(row, { hideStaffNote: true })),
    );
  }

  async get(userId: string, recordId: string) {
    const record = await this.findRecord(recordId);
    if (!(await this.canView(userId, record))) {
      throw new ForbiddenException("You cannot access this attendance record.");
    }
    const parent = await this.parentAccess(userId, record.childId).catch(
      () => null,
    );
    return attendanceDetailSchema.parse(
      this.toSummary(record, { hideStaffNote: Boolean(parent) }),
    );
  }

  async checkIn(userId: string, input: RecordAttendanceCheckInInput) {
    const enrollment = await this.requireStaffChildAccess(userId, input.childId);
    const attendanceDate = parseDate(input.attendanceDate);
    const checkedInAt = input.checkedInAt ? new Date(input.checkedInAt) : new Date();

    const record = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findUnique({
        where: {
          childId_attendanceDate: {
            childId: input.childId,
            attendanceDate,
          },
        },
      });
      if (existing?.checkOutAt) {
        throw new BadRequestException(
          "This child is already checked out for the selected date.",
        );
      }
      const updated = await tx.attendanceRecord.upsert({
        where: {
          childId_attendanceDate: {
            childId: input.childId,
            attendanceDate,
          },
        },
        create: {
          centerId: enrollment.centerId,
          classId: requireClassId(enrollment),
          childId: input.childId,
          attendanceDate,
          status: input.late ? "late" : "present",
          checkInAt: checkedInAt,
          checkInByUserId: userId,
          note: emptyToNull(input.staffNote),
          parentVisibleNote: emptyToNull(input.parentVisibleNote),
        },
        update: {
          status: input.late ? "late" : "present",
          checkInAt: checkedInAt,
          checkInByUserId: userId,
          checkOutAt: null,
          checkOutByUserId: null,
          absenceReason: null,
          ...(input.staffNote !== undefined
            ? { note: emptyToNull(input.staffNote) }
            : {}),
          ...(input.parentVisibleNote !== undefined
            ? { parentVisibleNote: emptyToNull(input.parentVisibleNote) }
            : {}),
        },
        include: attendanceInclude,
      });
      await this.audit.log(
        {
          organizationId: enrollment.organizationId,
          centerId: enrollment.centerId,
          actorUserId: userId,
          action: "attendance.check_in",
          entityType: "attendance_record",
          entityId: updated.id,
          metadata: {
            child_id: input.childId,
            attendance_date: input.attendanceDate,
            previous_status: existing?.status ?? "not_checked_in",
            new_status: updated.status,
          },
        },
        tx,
      );
      await this.notifyGuardians(tx, updated, "checked_in");
      return updated;
    });

    return attendanceDetailSchema.parse(this.toSummary(record));
  }

  async checkOut(userId: string, input: RecordAttendanceCheckOutInput) {
    const enrollment = await this.requireStaffChildAccess(userId, input.childId);
    const attendanceDate = parseDate(input.attendanceDate);
    const checkedOutAt = input.checkedOutAt
      ? new Date(input.checkedOutAt)
      : new Date();

    const record = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findUnique({
        where: {
          childId_attendanceDate: {
            childId: input.childId,
            attendanceDate,
          },
        },
      });
      if (existing?.status === "absent" || existing?.status === "excused") {
        throw new BadRequestException(
          "Absent or excused children cannot be checked out without correction.",
        );
      }
      const updated = await tx.attendanceRecord.upsert({
        where: {
          childId_attendanceDate: {
            childId: input.childId,
            attendanceDate,
          },
        },
        create: {
          centerId: enrollment.centerId,
          classId: requireClassId(enrollment),
          childId: input.childId,
          attendanceDate,
          status: input.leftEarly ? "left_early" : "picked_up",
          checkOutAt: checkedOutAt,
          checkOutByUserId: userId,
          note: emptyToNull(input.staffNote),
          parentVisibleNote: emptyToNull(input.parentVisibleNote),
        },
        update: {
          status: input.leftEarly ? "left_early" : "picked_up",
          checkOutAt: checkedOutAt,
          checkOutByUserId: userId,
          ...(input.staffNote !== undefined
            ? { note: emptyToNull(input.staffNote) }
            : {}),
          ...(input.parentVisibleNote !== undefined
            ? { parentVisibleNote: emptyToNull(input.parentVisibleNote) }
            : {}),
        },
        include: attendanceInclude,
      });
      await this.audit.log(
        {
          organizationId: enrollment.organizationId,
          centerId: enrollment.centerId,
          actorUserId: userId,
          action: "attendance.check_out",
          entityType: "attendance_record",
          entityId: updated.id,
          metadata: {
            child_id: input.childId,
            attendance_date: input.attendanceDate,
            previous_status: existing?.status ?? "not_checked_in",
            new_status: updated.status,
          },
        },
        tx,
      );
      await this.notifyGuardians(tx, updated, "checked_out");
      return updated;
    });

    return attendanceDetailSchema.parse(this.toSummary(record));
  }

  async markStatus(userId: string, input: MarkAttendanceStatusInput) {
    const enrollment = await this.requireStaffChildAccess(userId, input.childId);
    const attendanceDate = parseDate(input.attendanceDate);
    const clearsTimes = input.status === "absent" || input.status === "excused";
    const absenceReason = clearsTimes
      ? requireAbsenceReason(input.absenceReason)
      : null;

    const record = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findUnique({
        where: {
          childId_attendanceDate: {
            childId: input.childId,
            attendanceDate,
          },
        },
      });
      const updated = await tx.attendanceRecord.upsert({
        where: {
          childId_attendanceDate: {
            childId: input.childId,
            attendanceDate,
          },
        },
        create: {
          centerId: enrollment.centerId,
          classId: requireClassId(enrollment),
          childId: input.childId,
          attendanceDate,
          status: input.status,
          absenceReason,
          note: emptyToNull(input.staffNote),
          parentVisibleNote: emptyToNull(input.parentVisibleNote),
        },
        update: {
          status: input.status,
          absenceReason,
          ...(clearsTimes
            ? {
                checkInAt: null,
                checkInByUserId: null,
                checkOutAt: null,
                checkOutByUserId: null,
              }
            : {}),
          ...(input.staffNote !== undefined
            ? { note: emptyToNull(input.staffNote) }
            : {}),
          ...(input.parentVisibleNote !== undefined
            ? { parentVisibleNote: emptyToNull(input.parentVisibleNote) }
            : {}),
        },
        include: attendanceInclude,
      });
      await this.audit.log(
        {
          organizationId: enrollment.organizationId,
          centerId: enrollment.centerId,
          actorUserId: userId,
          action:
            input.status === "absent" || input.status === "excused"
              ? "attendance.mark_absent"
              : "attendance.corrected",
          entityType: "attendance_record",
          entityId: updated.id,
          metadata: {
            child_id: input.childId,
            attendance_date: input.attendanceDate,
            previous_status: existing?.status ?? "not_checked_in",
            new_status: updated.status,
          },
        },
        tx,
      );
      return updated;
    });

    return attendanceDetailSchema.parse(this.toSummary(record));
  }

  async parentSubmitAbsence(
    userId: string,
    input: ParentSubmitAttendanceAbsenceInput,
  ) {
    const access = await this.parentAccess(userId, input.childId);
    const enrollment = access.enrollments.find(
      (item) => item.childId === input.childId,
    );
    if (!enrollment) {
      throw new ForbiddenException("You cannot access this child.");
    }
    const attendanceDate = parseDate(input.attendanceDate);
    const absenceReason = requireAbsenceReason(input.absenceReason);

    const record = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findUnique({
        where: {
          childId_attendanceDate: {
            childId: input.childId,
            attendanceDate,
          },
        },
      });
      if (existing?.checkInAt || existing?.checkOutAt) {
        throw new BadRequestException(
          "This child already has attendance times for the selected date.",
        );
      }

      const updated = await tx.attendanceRecord.upsert({
        where: {
          childId_attendanceDate: {
            childId: input.childId,
            attendanceDate,
          },
        },
        create: {
          centerId: enrollment.centerId,
          classId: requireClassId(enrollment),
          childId: input.childId,
          attendanceDate,
          status: "absent",
          absenceReason,
          parentVisibleNote: emptyToNull(input.parentVisibleNote),
        },
        update: {
          status: "absent",
          checkInAt: null,
          checkInByUserId: null,
          checkOutAt: null,
          checkOutByUserId: null,
          absenceReason,
          parentVisibleNote: emptyToNull(input.parentVisibleNote),
        },
        include: attendanceInclude,
      });

      await this.audit.log(
        {
          organizationId: enrollment.organizationId,
          centerId: enrollment.centerId,
          actorUserId: userId,
          action: "attendance.parent_absence_submitted",
          entityType: "attendance_record",
          entityId: updated.id,
          metadata: {
            child_id: input.childId,
            attendance_date: input.attendanceDate,
            previous_status: existing?.status ?? "not_checked_in",
            new_status: updated.status,
          },
        },
        tx,
      );
      await this.notifyStaffAbsenceSubmitted(tx, updated);
      return updated;
    });

    return attendanceDetailSchema.parse(
      this.toSummary(record, { hideStaffNote: true }),
    );
  }

  private async findRecord(recordId: string) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: attendanceInclude,
    });
    if (!record) throw new NotFoundException("Attendance record not found.");
    return record;
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
      throw new ForbiddenException("You cannot manage attendance for this center.");
    }
    return {
      director: false,
      classIds: assignments.map((assignment) => assignment.classId),
    };
  }

  private async requireStaffChildAccess(userId: string, childId: string) {
    const enrollment = await this.activeEnrollment(childId);
    const scope = await this.requireStaffScope(userId, enrollment.centerId);
    if (
      !scope.director &&
      (!enrollment.classId || !scope.classIds.includes(enrollment.classId))
    ) {
      throw new ForbiddenException("You cannot manage this child's attendance.");
    }
    return enrollment;
  }

  private async listStaffEnrollments(
    centerId: string,
    scope: { director: boolean; classIds: string[] },
    filters: { classId?: string } = {},
  ) {
    const rows = await this.prisma.childEnrollment.findMany({
      where: {
        centerId,
        enrollmentStatus: "active",
        ...(filters.classId
          ? { classId: filters.classId }
          : scope.director
            ? {}
            : { classId: { in: scope.classIds } }),
      },
      include: {
        center: { select: { name: true, organizationId: true } },
        child: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { child: { firstName: "asc" } }],
    });
    return rows.map((row) => toEnrollment(row));
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
                center: { select: { name: true, organizationId: true } },
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
      guardian.child.childEnrollments.map((enrollment) =>
        toEnrollment({
          ...enrollment,
          child: guardian.child,
        }),
      ),
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

  private async activeEnrollment(childId: string) {
    const enrollment = await this.prisma.childEnrollment.findFirst({
      where: { childId, enrollmentStatus: "active" },
      include: {
        center: { select: { name: true, organizationId: true } },
        child: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });
    if (!enrollment) {
      throw new ForbiddenException("No active child enrollment found.");
    }
    return toEnrollment(enrollment);
  }

  private async canView(userId: string, record: AttendancePayload) {
    const parent = await this.parentAccess(userId, record.childId).catch(
      () => null,
    );
    if (parent) return true;
    const scope = await this.requireStaffScope(userId, record.centerId).catch(
      () => null,
    );
    if (!scope) return false;
    if (scope.director) return true;
    return scope.classIds.includes(record.classId);
  }

  private async notifyGuardians(
    tx: Tx,
    record: AttendancePayload,
    event: "checked_in" | "checked_out",
  ) {
    const guardians = await tx.childGuardian.findMany({
      where: { childId: record.childId },
      select: { userId: true },
    });
    const child = childName(record.child);
    const time =
      event === "checked_in" ? record.checkInAt : record.checkOutAt;
    const title =
      event === "checked_in" ? "Child checked in" : "Child checked out";
    const body =
      event === "checked_in"
        ? `${child} arrived at ${formatTime(time)}.`
        : `${child} left at ${formatTime(time)}.`;

    await Promise.all(
      unique(guardians.map((guardian) => guardian.userId)).map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: `attendance.${event}`,
            title,
            body,
            entityType: "attendance_record",
            entityId: record.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private async notifyStaffAbsenceSubmitted(tx: Tx, record: AttendancePayload) {
    const directorRoles = await tx.userRole.findMany({
      where: {
        role: { name: { in: ["director", "organization_owner"] } },
        OR: [
          { centerId: record.centerId },
          {
            organizationId: record.center.organizationId,
            centerId: null,
          },
        ],
      },
      select: { userId: true },
    });
    const teacherAssignments = await tx.teacherClassAssignment.findMany({
      where: {
        classId: record.classId,
        endedAt: null,
      },
      select: { teacherUserId: true },
    });
    const child = childName(record.child);

    await Promise.all(
      unique([
        ...directorRoles.map((item) => item.userId),
        ...teacherAssignments.map((item) => item.teacherUserId),
      ]).map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: "attendance.parent_absence_submitted",
            title: "Absence reason submitted",
            body: `${child} will be absent on ${toIsoDate(
              record.attendanceDate,
            )}.`,
            entityType: "attendance_record",
            entityId: record.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private toSummary(
    record: AttendancePayload,
    options: { hideStaffNote?: boolean } = {},
  ): AttendanceRecordSummary {
    return {
      id: record.id,
      centerId: record.centerId,
      centerName: record.center.name,
      classId: record.classId,
      className: record.class.name,
      child: {
        id: record.child.id,
        name: childName(record.child),
        centerId: record.centerId,
        centerName: record.center.name,
        classId: record.classId,
        className: record.class.name,
      },
      attendanceDate: toIsoDate(record.attendanceDate),
      status: attendanceStatusSchema.parse(record.status),
      checkedInAt: record.checkInAt?.toISOString() ?? null,
      checkedOutAt: record.checkOutAt?.toISOString() ?? null,
      absenceReason: record.absenceReason,
      staffNote: options.hideStaffNote ? null : record.note,
      parentVisibleNote: record.parentVisibleNote,
      recordedBy: record.checkInByUser ?? null,
      updatedBy: record.checkOutByUser ?? record.checkInByUser ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private emptySummary(
    enrollment: EnrollmentSummary,
    attendanceDate: Date,
  ): AttendanceRecordSummary {
    return {
      id: null,
      centerId: enrollment.centerId,
      centerName: enrollment.centerName,
      classId: enrollment.classId,
      className: enrollment.className,
      child: {
        id: enrollment.childId,
        name: enrollment.childName,
        centerId: enrollment.centerId,
        centerName: enrollment.centerName,
        classId: enrollment.classId,
        className: enrollment.className,
      },
      attendanceDate: toIsoDate(attendanceDate),
      status: "not_checked_in",
      checkedInAt: null,
      checkedOutAt: null,
      absenceReason: null,
      staffNote: null,
      parentVisibleNote: null,
      recordedBy: null,
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
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

function requireAbsenceReason(value?: string | null) {
  const cleaned = clean(value);
  if (!cleaned) {
    throw new BadRequestException("Please add an absence reason.");
  }
  return cleaned;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function childName(child: { firstName: string; lastName: string | null }) {
  return [child.firstName, child.lastName].filter(Boolean).join(" ");
}

function toEnrollment(row: {
  childId: string;
  centerId: string;
  classId: string | null;
  center: { name: string; organizationId: string };
  class: { id: string; name: string } | null;
  child: { id: string; firstName: string; lastName: string | null };
}): EnrollmentSummary {
  return {
    childId: row.childId,
    childName: childName(row.child),
    centerId: row.centerId,
    centerName: row.center.name,
    organizationId: row.center.organizationId,
    classId: row.classId,
    className: row.class?.name ?? null,
  };
}

function requireClassId(enrollment: EnrollmentSummary) {
  if (!enrollment.classId) {
    throw new BadRequestException("Child is not assigned to a class.");
  }
  return enrollment.classId;
}

function summarize(records: AttendanceRecordSummary[]) {
  const counts = {
    total: records.length,
    notCheckedIn: 0,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    leftEarly: 0,
    pickedUp: 0,
  };

  for (const record of records) {
    if (record.status === "not_checked_in") counts.notCheckedIn += 1;
    if (record.status === "present") counts.present += 1;
    if (record.status === "late") counts.late += 1;
    if (record.status === "absent") counts.absent += 1;
    if (record.status === "excused") counts.excused += 1;
    if (record.status === "left_early") counts.leftEarly += 1;
    if (record.status === "picked_up") counts.pickedUp += 1;
  }

  return counts;
}

function formatTime(value: Date | null) {
  if (!value) return "the recorded time";
  return value.toISOString().slice(11, 16);
}
