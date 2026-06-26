import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  calendarBirthdayListResponseSchema,
  calendarEventListResponseSchema,
  calendarEventStatusSchema,
  calendarEventSummarySchema,
  calendarReminderPublishResponseSchema,
  type CalendarAudienceType,
  type CalendarBirthdayEntry,
  type CalendarEventStatus,
  type CalendarEventSummary,
  type CancelCalendarEventInput,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const calendarInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
  authorUser: { select: { id: true, fullName: true } },
  classes: { include: { class: { select: { id: true, name: true } } } },
  children: {
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  seen: { select: { userId: true } },
} satisfies Prisma.CalendarEventInclude;

type CalendarPayload = Prisma.CalendarEventGetPayload<{
  include: typeof calendarInclude;
}>;

type StaffScope = {
  director: boolean;
  classIds: string[];
  childIds: string[];
};

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
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForStaff(
    userId: string,
    filters: {
      centerId?: string;
      from: string;
      to: string;
      status?: CalendarEventStatus;
    },
  ) {
    if (!filters.centerId) {
      throw new BadRequestException("Center is required.");
    }
    const scope = await this.requireStaffScope(userId, filters.centerId);
    await this.publishDueReminders();
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        centerId: filters.centerId,
        startsAt: { gte: new Date(filters.from), lte: new Date(filters.to) },
        ...(filters.status ? { status: filters.status } : {}),
        ...(scope.director
          ? {}
          : {
              OR: [
                { audienceType: "center" },
                { classes: { some: { classId: { in: scope.classIds } } } },
                { children: { some: { childId: { in: scope.childIds } } } },
              ],
            }),
      },
      include: calendarInclude,
      orderBy: { startsAt: "asc" },
    });
    return calendarEventListResponseSchema.parse(
      events.map((event) => this.toSummary(event, userId)),
    );
  }

  async listForParent(
    userId: string,
    filters: {
      centerId?: string;
      childId?: string;
      from: string;
      to: string;
      status?: CalendarEventStatus;
    },
  ) {
    const access = await this.parentAccess(userId, filters.childId);
    await this.publishDueReminders();
    const enrollments = access.enrollments.filter((enrollment) =>
      filters.centerId ? enrollment.centerId === filters.centerId : true,
    );
    const centerIds = unique(enrollments.map((item) => item.centerId));
    const classIds = unique(
      enrollments.flatMap((item) => (item.classId ? [item.classId] : [])),
    );
    const childIds = unique(enrollments.map((item) => item.childId));
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        centerId: { in: centerIds },
        startsAt: { gte: new Date(filters.from), lte: new Date(filters.to) },
        ...(filters.status ? { status: filters.status } : {}),
        OR: [
          { audienceType: "center" },
          { classes: { some: { classId: { in: classIds } } } },
          { children: { some: { childId: { in: childIds } } } },
        ],
      },
      include: calendarInclude,
      orderBy: { startsAt: "asc" },
    });
    return calendarEventListResponseSchema.parse(
      events.map((event) => this.toSummary(event, userId)),
    );
  }

  async upcoming(
    userId: string,
    input: { centerId?: string; childId?: string; limit?: number } = {},
  ) {
    const from = new Date();
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 45);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    const isStaff = user?.userRoles.some((item) =>
      ["director", "organization_owner", "teacher"].includes(item.role.name),
    );
    const events =
      isStaff && input.centerId
        ? await this.listForStaff(userId, {
            centerId: input.centerId,
            from: from.toISOString(),
            to: to.toISOString(),
            status: "scheduled",
          })
        : await this.listForParent(userId, {
            centerId: input.centerId,
            childId: input.childId,
            from: from.toISOString(),
            to: to.toISOString(),
            status: "scheduled",
          });
    return calendarEventListResponseSchema.parse(
      events.slice(0, input.limit ?? 10),
    );
  }

  /**
   * Classmate birthdays for a parent, within [from, to] (date-only). Birthdays
   * are derived from each child's date of birth — not calendar events — and are
   * scoped to the parent's own child's class(es): a parent sees birthdays for
   * children actively enrolled in the same class, never the whole center.
   */
  async birthdaysForParent(
    userId: string,
    filters: { centerId?: string; childId?: string; from: string; to: string },
  ) {
    const access = await this.parentAccess(userId, filters.childId);
    const enrollments = access.enrollments.filter((enrollment) =>
      filters.centerId ? enrollment.centerId === filters.centerId : true,
    );
    const classIds = unique(
      enrollments.flatMap((item) => (item.classId ? [item.classId] : [])),
    );
    if (classIds.length === 0) {
      return calendarBirthdayListResponseSchema.parse([]);
    }
    const ownChildIds = new Set(access.childIds);

    const classmates = await this.prisma.childEnrollment.findMany({
      where: { enrollmentStatus: "active", classId: { in: classIds } },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dob: true,
            photoUrl: true,
          },
        },
        class: { select: { id: true, name: true } },
      },
    });

    return calendarBirthdayListResponseSchema.parse(
      this.collectBirthdays(classmates, filters.from, filters.to, ownChildIds),
    );
  }

  /**
   * Classmate birthdays for staff, within [from, to] (date-only). A teacher sees
   * birthdays for the children in their assigned classes; a director sees every
   * active class in the center. Staff never have an "own child", so every entry
   * reads as a classmate.
   */
  async birthdaysForStaff(
    userId: string,
    filters: { centerId: string; from: string; to: string },
  ) {
    const scope = await this.requireStaffScope(userId, filters.centerId);
    const classes = await this.prisma.class.findMany({
      where: scope.director
        ? { centerId: filters.centerId, status: "active" }
        : { id: { in: scope.classIds }, centerId: filters.centerId, status: "active" },
      select: { id: true },
    });
    const classIds = classes.map((item) => item.id);
    if (classIds.length === 0) {
      return calendarBirthdayListResponseSchema.parse([]);
    }

    const enrollments = await this.prisma.childEnrollment.findMany({
      where: { enrollmentStatus: "active", classId: { in: classIds } },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dob: true,
            photoUrl: true,
          },
        },
        class: { select: { id: true, name: true } },
      },
    });

    return calendarBirthdayListResponseSchema.parse(
      this.collectBirthdays(enrollments, filters.from, filters.to, new Set()),
    );
  }

  /**
   * Pick the right birthday source for the caller: staff (with a center) see
   * their classes' birthdays; everyone else sees their child's classmates'.
   */
  async birthdays(
    userId: string,
    filters: { centerId?: string; childId?: string; from: string; to: string },
  ) {
    if (filters.centerId && (await this.isStaffUser(userId))) {
      return this.birthdaysForStaff(userId, {
        centerId: filters.centerId,
        from: filters.from,
        to: filters.to,
      });
    }
    return this.birthdaysForParent(userId, filters);
  }

  /** Reduce active class enrollments to one birthday entry per child per
   *  occurrence, de-duplicated across overlapping classes and sorted by date. */
  private collectBirthdays(
    enrollments: Array<{
      child: {
        id: string;
        firstName: string;
        lastName: string | null;
        dob: Date;
        photoUrl: string | null;
      };
      class: { id: string; name: string } | null;
    }>,
    from: string,
    to: string,
    ownChildIds: Set<string>,
  ): CalendarBirthdayEntry[] {
    const seen = new Set<string>();
    const entries: CalendarBirthdayEntry[] = [];
    for (const enrollment of enrollments) {
      if (seen.has(enrollment.child.id)) continue;
      seen.add(enrollment.child.id);
      for (const occurrence of birthdayOccurrences(
        enrollment.child.dob,
        from,
        to,
      )) {
        entries.push({
          childId: enrollment.child.id,
          childName: childName(enrollment.child),
          photoUrl: enrollment.child.photoUrl,
          classId: enrollment.class?.id ?? null,
          className: enrollment.class?.name ?? null,
          date: occurrence.date,
          turningAge: occurrence.turningAge,
          isOwnChild: ownChildIds.has(enrollment.child.id),
        });
      }
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    return entries;
  }

  /** True when the user holds any staff role (teacher, director, or owner). */
  private async isStaffUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    return (
      user?.userRoles.some((item) =>
        ["director", "organization_owner", "teacher"].includes(item.role.name),
      ) ?? false
    );
  }

  async get(userId: string, eventId: string) {
    const event = await this.findEvent(eventId);
    if (!(await this.canView(userId, event))) {
      throw new ForbiddenException("You cannot access this calendar event.");
    }
    return calendarEventSummarySchema.parse(this.toSummary(event, userId));
  }

  async create(userId: string, input: CreateCalendarEventInput) {
    const scope = await this.requireStaffScope(userId, input.centerId);
    const audience = await this.resolveAudience(input.centerId, scope, input);
    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.calendarEvent.create({
        data: {
          centerId: input.centerId,
          authorUserId: userId,
          audienceType: input.audienceType,
          title: clean(input.title),
          description: emptyToNull(input.description),
          locationText: emptyToNull(input.locationText),
          startsAt,
          endsAt,
          allDay: input.allDay ?? false,
          reminderMinutesBefore: input.reminderMinutesBefore ?? null,
          classes:
            input.audienceType === "class"
              ? {
                  create: audience.classIds.map((classId) => ({ classId })),
                }
              : undefined,
          children:
            input.audienceType === "child"
              ? {
                  create: audience.childIds.map((childId) => ({ childId })),
                }
              : undefined,
        },
        include: calendarInclude,
      });
      await this.audit.log(
        {
          organizationId: created.center.organizationId,
          centerId: created.centerId,
          actorUserId: userId,
          action: "calendar_event.created",
          entityType: "calendar_event",
          entityId: created.id,
          metadata: { audience_type: created.audienceType },
        },
        tx,
      );
      await this.notifyAudience(tx, created, "created");
      return created;
    });

    return calendarEventSummarySchema.parse(this.toSummary(event, userId));
  }

  async update(userId: string, input: UpdateCalendarEventInput) {
    const existing = await this.findEvent(input.eventId);
    const scope = await this.requireStaffScope(userId, existing.centerId);
    this.requireCanManage(scope, existing);
    const audienceType = input.body.audienceType ?? existing.audienceType;
    const audience = await this.resolveAudience(existing.centerId, scope, {
      audienceType: audienceType as CalendarAudienceType,
      classIds:
        input.body.classIds ??
        existing.classes.map((item) => item.classId),
      childIds:
        input.body.childIds ??
        existing.children.map((item) => item.childId),
    });
    const startsAt = input.body.startsAt
      ? new Date(input.body.startsAt)
      : existing.startsAt;
    const endsAt =
      input.body.endsAt !== undefined
        ? input.body.endsAt
          ? new Date(input.body.endsAt)
          : null
        : existing.endsAt;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException("End time must be after start time.");
    }

    const event = await this.prisma.$transaction(async (tx) => {
      await tx.calendarEventClass.deleteMany({
        where: { eventId: existing.id },
      });
      await tx.calendarEventChild.deleteMany({
        where: { eventId: existing.id },
      });
      const updated = await tx.calendarEvent.update({
        where: { id: existing.id },
        data: {
          audienceType,
          ...(input.body.title !== undefined
            ? { title: clean(input.body.title) }
            : {}),
          ...(input.body.description !== undefined
            ? { description: emptyToNull(input.body.description) }
            : {}),
          ...(input.body.locationText !== undefined
            ? { locationText: emptyToNull(input.body.locationText) }
            : {}),
          startsAt,
          endsAt,
          ...(input.body.allDay !== undefined
            ? { allDay: input.body.allDay }
            : {}),
          ...(input.body.reminderMinutesBefore !== undefined
            ? {
                reminderMinutesBefore: input.body.reminderMinutesBefore,
                reminderSentAt: null,
              }
            : {}),
          classes:
            audienceType === "class"
              ? {
                  create: audience.classIds.map((classId) => ({ classId })),
                }
              : undefined,
          children:
            audienceType === "child"
              ? {
                  create: audience.childIds.map((childId) => ({ childId })),
                }
              : undefined,
        },
        include: calendarInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "calendar_event.updated",
          entityType: "calendar_event",
          entityId: updated.id,
          metadata: {
            previous_status: existing.status,
            new_status: updated.status,
          },
        },
        tx,
      );
      await this.notifyAudience(tx, updated, "updated");
      return updated;
    });

    return calendarEventSummarySchema.parse(this.toSummary(event, userId));
  }

  async cancel(userId: string, input: CancelCalendarEventInput) {
    const existing = await this.findEvent(input.eventId);
    const scope = await this.requireStaffScope(userId, existing.centerId);
    this.requireCanManage(scope, existing);
    const event = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.calendarEvent.update({
        where: { id: existing.id },
        data: {
          status: "cancelled",
          cancellationReason: emptyToNull(input.cancellationReason),
        },
        include: calendarInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "calendar_event.cancelled",
          entityType: "calendar_event",
          entityId: updated.id,
        },
        tx,
      );
      await this.notifyAudience(tx, updated, "cancelled");
      return updated;
    });
    return calendarEventSummarySchema.parse(this.toSummary(event, userId));
  }

  async markSeen(userId: string, eventId: string) {
    const event = await this.findEvent(eventId);
    const parentAccess = await this.parentAccess(userId).catch(() => null);
    if (!parentAccess || !(await this.canViewAsParent(parentAccess, event))) {
      throw new ForbiddenException("You cannot mark this event as seen.");
    }
    await this.prisma.calendarEventSeen.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId },
      update: { seenAt: new Date() },
    });
    await this.audit.log({
      organizationId: event.center.organizationId,
      centerId: event.centerId,
      actorUserId: userId,
      action: "calendar_event.seen",
      entityType: "calendar_event",
      entityId: event.id,
    });
    return this.get(userId, eventId);
  }

  async publishDueReminders(now: Date = new Date()) {
    const windowEnd = new Date(now);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 3);
    const candidates = await this.prisma.calendarEvent.findMany({
      where: {
        status: "scheduled",
        reminderMinutesBefore: { not: null },
        reminderSentAt: null,
        startsAt: { gte: now, lte: windowEnd },
      },
      include: calendarInclude,
    });
    let sent = 0;
    for (const event of candidates) {
      const dueAt = new Date(
        event.startsAt.getTime() -
          (event.reminderMinutesBefore ?? 0) * 60 * 1000,
      );
      if (dueAt > now) continue;
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.calendarEvent.update({
          where: { id: event.id },
          data: { reminderSentAt: now },
          include: calendarInclude,
        });
        await this.notifyAudience(tx, updated, "reminder");
        await this.audit.log(
          {
            organizationId: updated.center.organizationId,
            centerId: updated.centerId,
            actorUserId: null,
            action: "calendar_event.reminder_sent",
            entityType: "calendar_event",
            entityId: updated.id,
          },
          tx,
        );
      });
      sent += 1;
    }
    return calendarReminderPublishResponseSchema.parse({ sent });
  }

  private async findEvent(eventId: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: calendarInclude,
    });
    if (!event) throw new NotFoundException("Calendar event not found.");
    return event;
  }

  private async requireStaffScope(
    userId: string,
    centerId: string,
  ): Promise<StaffScope> {
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
    if (director) return { director: true, classIds: [], childIds: [] };
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: {
        teacherUserId: userId,
        endedAt: null,
        class: { centerId, status: "active" },
      },
      select: { classId: true },
    });
    if (assignments.length === 0) {
      throw new ForbiddenException("You cannot manage this center calendar.");
    }
    const classIds = assignments.map((assignment) => assignment.classId);
    const children = await this.prisma.childEnrollment.findMany({
      where: {
        centerId,
        enrollmentStatus: "active",
        classId: { in: classIds },
      },
      select: { childId: true },
    });
    return {
      director: false,
      classIds,
      childIds: children.map((child) => child.childId),
    };
  }

  private async resolveAudience(
    centerId: string,
    scope: StaffScope,
    input: {
      audienceType: CalendarAudienceType;
      classIds?: string[];
      childIds?: string[];
    },
  ) {
    if (input.audienceType === "center") {
      if (!scope.director) {
        throw new ForbiddenException("Only directors can create center events.");
      }
      return { classIds: [], childIds: [] };
    }
    if (input.audienceType === "class") {
      const classIds = unique(input.classIds ?? []);
      if (classIds.length === 0) {
        throw new BadRequestException("Choose at least one class.");
      }
      const classes = await this.prisma.class.findMany({
        where: { id: { in: classIds }, centerId, status: "active" },
        select: { id: true },
      });
      if (classes.length !== classIds.length) {
        throw new ForbiddenException("One or more classes are not available.");
      }
      if (!scope.director && classIds.some((id) => !scope.classIds.includes(id))) {
        throw new ForbiddenException("You cannot manage one or more classes.");
      }
      return { classIds, childIds: [] };
    }
    const childIds = unique(input.childIds ?? []);
    if (childIds.length === 0) {
      throw new BadRequestException("Choose at least one child.");
    }
    const enrollments = await this.prisma.childEnrollment.findMany({
      where: {
        childId: { in: childIds },
        centerId,
        enrollmentStatus: "active",
      },
      select: { childId: true, classId: true },
    });
    if (enrollments.length !== childIds.length) {
      throw new ForbiddenException("One or more children are not available.");
    }
    if (
      !scope.director &&
      enrollments.some(
        (enrollment) =>
          !enrollment.classId || !scope.classIds.includes(enrollment.classId),
      )
    ) {
      throw new ForbiddenException("You cannot manage one or more children.");
    }
    return { classIds: [], childIds };
  }

  private requireCanManage(scope: StaffScope, event: CalendarPayload) {
    if (scope.director) return;
    if (event.authorUserId) {
      const classIds = event.classes.map((item) => item.classId);
      const childIds = event.children.map((item) => item.childId);
      if (
        event.audienceType === "class" &&
        classIds.every((id) => scope.classIds.includes(id))
      ) {
        return;
      }
      if (
        event.audienceType === "child" &&
        childIds.every((id) => scope.childIds.includes(id))
      ) {
        return;
      }
    }
    throw new ForbiddenException("You cannot manage this event.");
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
      classIds: unique(
        enrollments.flatMap((item) => (item.classId ? [item.classId] : [])),
      ),
      centerIds: unique(enrollments.map((item) => item.centerId)),
      enrollments,
    };
  }

  private async canView(userId: string, event: CalendarPayload) {
    const parent = await this.parentAccess(userId).catch(() => null);
    if (parent && this.canViewAsParent(parent, event)) return true;
    const scope = await this.requireStaffScope(userId, event.centerId).catch(
      () => null,
    );
    if (!scope) return false;
    if (scope.director) return true;
    if (event.audienceType === "center") return true;
    if (
      event.classes.some((item) => scope.classIds.includes(item.classId)) ||
      event.children.some((item) => scope.childIds.includes(item.childId))
    ) {
      return true;
    }
    return false;
  }

  private canViewAsParent(
    access: {
      childIds: string[];
      classIds: string[];
      centerIds: string[];
    },
    event: CalendarPayload,
  ) {
    if (!access.centerIds.includes(event.centerId)) return false;
    if (event.audienceType === "center") return true;
    if (
      event.audienceType === "class" &&
      event.classes.some((item) => access.classIds.includes(item.classId))
    ) {
      return true;
    }
    return event.children.some((item) => access.childIds.includes(item.childId));
  }

  private async notifyAudience(
    tx: Tx,
    event: CalendarPayload,
    kind: "created" | "updated" | "cancelled" | "reminder",
  ) {
    const recipients = await this.parentRecipients(tx, event);
    const title = notificationTitle(kind);
    const body = notificationBody(event, kind);
    await Promise.all(
      recipients.map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: `calendar_event.${kind}`,
            title,
            body,
            entityType: "calendar_event",
            entityId: event.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private async parentRecipients(tx: Tx, event: CalendarPayload) {
    const childIds = await this.visibleChildIds(tx, event);
    if (childIds.length === 0) return [];
    const guardians = await tx.childGuardian.findMany({
      where: { childId: { in: childIds } },
      select: { userId: true },
    });
    return unique(guardians.map((guardian) => guardian.userId));
  }

  private async visibleChildIds(tx: Tx, event: CalendarPayload) {
    if (event.audienceType === "child") {
      return event.children.map((item) => item.childId);
    }
    if (event.audienceType === "class") {
      const enrollments = await tx.childEnrollment.findMany({
        where: {
          enrollmentStatus: "active",
          classId: { in: event.classes.map((item) => item.classId) },
        },
        select: { childId: true },
      });
      return unique(enrollments.map((item) => item.childId));
    }
    const enrollments = await tx.childEnrollment.findMany({
      where: {
        centerId: event.centerId,
        enrollmentStatus: "active",
      },
      select: { childId: true },
    });
    return unique(enrollments.map((item) => item.childId));
  }

  private toSummary(
    event: CalendarPayload,
    userId: string | null,
  ): CalendarEventSummary {
    return {
      id: event.id,
      centerId: event.centerId,
      centerName: event.center.name,
      authorUserId: event.authorUserId,
      authorName: event.authorUser.fullName,
      audienceType: event.audienceType as CalendarAudienceType,
      classIds: event.classes.map((item) => item.classId),
      classNames: event.classes.map((item) => item.class.name),
      childIds: event.children.map((item) => item.childId),
      childNames: event.children.map((item) => childName(item.child)),
      title: event.title,
      description: event.description,
      locationText: event.locationText,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      allDay: event.allDay,
      status: calendarEventStatusSchema.parse(event.status),
      cancellationReason: event.cancellationReason,
      reminderMinutesBefore: parseReminder(event.reminderMinutesBefore),
      reminderSentAt: event.reminderSentAt?.toISOString() ?? null,
      seenByMe: userId ? event.seen.some((item) => item.userId === userId) : false,
      seenCount: event.seen.length,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

const pad = (value: number) => String(value).padStart(2, "0");

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Every yearly recurrence of a date of birth that lands within [from, to]
 * (date-only "YYYY-MM-DD"). Feb 29 birthdays fall back to Feb 28 in non-leap
 * years so they always appear once a year.
 */
function birthdayOccurrences(
  dob: Date,
  from: string,
  to: string,
): { date: string; turningAge: number }[] {
  const birthYear = dob.getUTCFullYear();
  const birthMonth = dob.getUTCMonth() + 1; // 1-12
  const birthDay = dob.getUTCDate();
  const fromYear = Number(from.slice(0, 4));
  const toYear = Number(to.slice(0, 4));
  const results: { date: string; turningAge: number }[] = [];
  for (let year = fromYear; year <= toYear; year += 1) {
    const day =
      birthMonth === 2 && birthDay === 29 && !isLeapYear(year) ? 28 : birthDay;
    const date = `${year}-${pad(birthMonth)}-${pad(day)}`;
    if (date >= from && date <= to) {
      results.push({ date, turningAge: Math.max(0, year - birthYear) });
    }
  }
  return results;
}

function clean(value: string) {
  return value.trim();
}

function emptyToNull(value?: string | null) {
  const cleaned = value?.trim() ?? "";
  return cleaned ? cleaned : null;
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

function parseReminder(value: number | null) {
  if (value === 60 || value === 1440 || value === 4320) return value;
  return null;
}

function notificationTitle(kind: "created" | "updated" | "cancelled" | "reminder") {
  if (kind === "created") return "New event";
  if (kind === "updated") return "Event updated";
  if (kind === "cancelled") return "Event cancelled";
  return "Event reminder";
}

function notificationBody(
  event: CalendarPayload,
  kind: "created" | "updated" | "cancelled" | "reminder",
) {
  const date = event.startsAt.toISOString().slice(0, 16).replace("T", " ");
  if (kind === "created") return `${event.title} is scheduled for ${date}.`;
  if (kind === "updated") return `${event.title} schedule was updated.`;
  if (kind === "cancelled") return `${event.title} was cancelled.`;
  return `${event.title} starts soon.`;
}
