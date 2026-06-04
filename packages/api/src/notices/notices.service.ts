import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  noticeAudienceResponseSchema,
  noticeDetailSchema,
  noticeRecipientActionResponseSchema,
  noticeSummarySchema,
  type CreateNoticeRequest,
  type NoticeTargetType,
  type PublishNoticeRequest,
  type UpdateNoticeRequest,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;
type AuthorAccess =
  | { level: "director"; centerId: string; organizationId: string }
  | { level: "teacher"; centerId: string; classIds: string[] };

const DIRECTOR_ROLE_NAMES = ["director", "organization_owner"];
const noticeInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
  authorUser: { select: { id: true, fullName: true } },
  targets: { orderBy: { createdAt: "asc" } },
  recipients: {
    include: {
      user: { select: { id: true, fullName: true } },
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          childEnrollments: {
            where: { enrollmentStatus: "active" },
            include: { class: { select: { id: true, name: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.NoticeInclude;

type NoticePayload = Prisma.NoticeGetPayload<{ include: typeof noticeInclude }>;

@Injectable()
export class NoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async audience(userId: string, centerId: string) {
    const access = await this.requireAuthorAccess(userId, centerId);
    const classWhere =
      access.level === "director"
        ? { centerId, status: "active" }
        : { id: { in: access.classIds }, status: "active" };

    const classes = await this.prisma.class.findMany({
      where: classWhere,
      orderBy: { name: "asc" },
    });
    const children = await this.prisma.childEnrollment.findMany({
      where: {
        centerId,
        enrollmentStatus: "active",
        classId:
          access.level === "director" ? undefined : { in: access.classIds },
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "asc" },
    });

    return noticeAudienceResponseSchema.parse({
      classes: classes.map((klass) => ({ id: klass.id, name: klass.name })),
      children: children.map((enrollment) => ({
        id: enrollment.child.id,
        name: childName(enrollment.child),
        classId: enrollment.classId,
        className: enrollment.class?.name ?? null,
      })),
    });
  }

  async listForAuthor(userId: string, centerId: string, status?: string) {
    const access = await this.requireAuthorAccess(userId, centerId);
    await this.publishDueScheduledNotices();

    const notices = await this.prisma.notice.findMany({
      where: {
        centerId,
        status,
        ...(access.level === "teacher" ? { authorUserId: userId } : {}),
      },
      include: noticeInclude,
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });

    return Promise.all(notices.map((notice) => this.toSummary(notice)));
  }

  async create(userId: string, input: CreateNoticeRequest) {
    const access = await this.requireAuthorAccess(userId, input.centerId);
    await this.assertTargetsAllowed(access, input.targetType, input.targetIds);

    const status = input.scheduledAt
      ? "scheduled"
      : input.publish
        ? "published"
        : "draft";
    const scheduledAt = input.scheduledAt
      ? parseDateTime(input.scheduledAt)
      : null;
    if (scheduledAt) assertNoticeScheduleWindow(scheduledAt);

    const notice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.notice.create({
        data: {
          centerId: input.centerId,
          authorUserId: userId,
          title: input.title.trim(),
          body: input.body.trim(),
          targetType: input.targetType,
          classId:
            input.targetType === "class" && input.targetIds.length === 1
              ? input.targetIds[0]
              : null,
          status,
          scheduledAt,
          publishedAt: status === "published" ? new Date() : null,
          requiresConfirmation: input.requiresConfirmation,
          allowComments: input.allowComments,
          isPinned: access.level === "director" ? input.isPinned : false,
          isImportant: input.isImportant,
          targets: {
            create: targetRows(input.targetType, input.targetIds),
          },
        },
        include: noticeInclude,
      });

      if (status === "published") {
        await this.publishSideEffects(tx, created, userId);
      } else {
        await this.auditNotice(tx, created, userId, "notice.created");
      }

      return created;
    });

    return this.getForAuthor(userId, notice.id);
  }

  async getForAuthor(userId: string, noticeId: string) {
    await this.publishDueScheduledNotices();
    const notice = await this.requireNotice(noticeId);
    await this.requireCanViewAsAuthor(userId, notice);
    return this.toDetail(notice);
  }

  async update(userId: string, noticeId: string, input: UpdateNoticeRequest) {
    const existing = await this.requireNotice(noticeId);
    const access = await this.requireCanEdit(userId, existing);
    const changingTargets =
      input.targetType !== undefined || input.targetIds !== undefined;
    if (existing.status === "published" && changingTargets) {
      throw new BadRequestException(
        "Unpublish the notice before changing its audience.",
      );
    }

    const nextTargetType = input.targetType ?? existing.targetType;
    const nextTargetIds =
      input.targetIds ?? existing.targets.map((t) => t.targetId);
    await this.assertTargetsAllowed(
      access,
      nextTargetType as NoticeTargetType,
      nextTargetIds,
    );

    const scheduledAt =
      input.scheduledAt !== undefined
        ? parseDateTime(input.scheduledAt)
        : undefined;
    if (scheduledAt) assertNoticeScheduleWindow(scheduledAt);

    await this.prisma.$transaction(async (tx) => {
      await tx.notice.update({
        where: { id: noticeId },
        data: {
          title: input.title !== undefined ? input.title.trim() : undefined,
          body: input.body !== undefined ? input.body.trim() : undefined,
          targetType: input.targetType,
          classId:
            nextTargetType === "class" && nextTargetIds.length === 1
              ? nextTargetIds[0]
              : nextTargetType === "class"
                ? null
                : undefined,
          requiresConfirmation: input.requiresConfirmation,
          allowComments: input.allowComments,
          isPinned:
            input.isPinned !== undefined && access.level === "director"
              ? input.isPinned
              : undefined,
          isImportant: input.isImportant,
          scheduledAt,
        },
      });

      if (changingTargets) {
        await tx.noticeTarget.deleteMany({ where: { noticeId } });
        await tx.noticeTarget.createMany({
          data: targetRows(
            nextTargetType as NoticeTargetType,
            nextTargetIds,
          ).map((row) => ({
            noticeId,
            targetKind: row.targetKind,
            targetId: row.targetId,
          })),
        });
      }

      await this.audit.log(
        {
          organizationId: existing.center.organizationId,
          centerId: existing.centerId,
          actorUserId: userId,
          action: "notice.updated",
          entityType: "notice",
          entityId: noticeId,
        },
        tx,
      );
    });

    return this.getForAuthor(userId, noticeId);
  }

  async publish(userId: string, noticeId: string, input: PublishNoticeRequest) {
    const existing = await this.requireNotice(noticeId);
    await this.requireCanEdit(userId, existing);
    const scheduledAt = input.scheduledAt
      ? parseDateTime(input.scheduledAt)
      : null;
    if (scheduledAt) assertNoticeScheduleWindow(scheduledAt);

    await this.prisma.$transaction(async (tx) => {
      const notice = await tx.notice.update({
        where: { id: noticeId },
        data: {
          status: scheduledAt ? "scheduled" : "published",
          scheduledAt,
          publishedAt: scheduledAt ? null : new Date(),
        },
        include: noticeInclude,
      });
      if (!scheduledAt) {
        await this.publishSideEffects(tx, notice, userId);
      }
    });

    return this.getForAuthor(userId, noticeId);
  }

  async unpublish(userId: string, noticeId: string) {
    const existing = await this.requireNotice(noticeId);
    await this.requireCanEdit(userId, existing);
    await this.prisma.notice.update({
      where: { id: noticeId },
      data: { status: "draft", scheduledAt: null, publishedAt: null },
    });
    await this.auditNotice(null, existing, userId, "notice.unpublished");
    return this.getForAuthor(userId, noticeId);
  }

  async delete(userId: string, noticeId: string) {
    const existing = await this.requireNotice(noticeId);
    await this.requireCanEdit(userId, existing);
    await this.prisma.$transaction(async (tx) => {
      await tx.notice.delete({ where: { id: noticeId } });
      await this.auditNotice(tx, existing, userId, "notice.deleted");
    });
    return { success: true };
  }

  async listForParent(userId: string, childId?: string) {
    await this.publishDueScheduledNotices();
    const rows = await this.prisma.noticeRecipient.findMany({
      where: {
        userId,
        childId,
        notice: { status: "published" },
      },
      include: { notice: { include: noticeInclude } },
      orderBy: [
        { notice: { isPinned: "desc" } },
        { notice: { publishedAt: "desc" } },
      ],
    });

    return Promise.all(
      rows.map((row) =>
        this.toSummary(row.notice, { userId, childId: row.childId }),
      ),
    );
  }

  async getForParent(userId: string, noticeId: string) {
    await this.publishDueScheduledNotices();
    const rows = await this.prisma.noticeRecipient.findMany({
      where: { userId, noticeId, notice: { status: "published" } },
      include: { notice: { include: noticeInclude } },
    });
    if (rows.length === 0) throw new NotFoundException("Notice not found.");

    await this.prisma.noticeRecipient.updateMany({
      where: { userId, noticeId, readAt: null },
      data: { readAt: new Date() },
    });

    const notice = await this.requireNotice(noticeId);
    return this.toDetail(notice, { userId, childId: rows[0].childId });
  }

  async confirm(userId: string, noticeId: string) {
    const now = new Date();
    const result = await this.prisma.noticeRecipient.updateMany({
      where: {
        userId,
        noticeId,
        notice: { status: "published", requiresConfirmation: true },
      },
      data: { readAt: now, confirmedAt: now },
    });
    if (result.count === 0) {
      throw new NotFoundException("Notice confirmation was not found.");
    }
    const row = await this.prisma.noticeRecipient.findFirstOrThrow({
      where: { userId, noticeId },
      orderBy: { createdAt: "asc" },
    });
    return noticeRecipientActionResponseSchema.parse({
      id: row.id,
      readAt: row.readAt?.toISOString() ?? null,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
    });
  }

  private async requireNotice(noticeId: string) {
    const notice = await this.prisma.notice.findUnique({
      where: { id: noticeId },
      include: noticeInclude,
    });
    if (!notice) throw new NotFoundException("Notice not found.");
    return notice;
  }

  private async requireCanViewAsAuthor(userId: string, notice: NoticePayload) {
    const access = await this.requireAuthorAccess(userId, notice.centerId);
    if (access.level === "director") return access;
    if (notice.authorUserId !== userId) {
      throw new ForbiddenException("You can only view your own notices.");
    }
    return access;
  }

  private async requireCanEdit(userId: string, notice: NoticePayload) {
    const access = await this.requireAuthorAccess(userId, notice.centerId);
    if (access.level === "director" || notice.authorUserId === userId) {
      return access;
    }
    throw new ForbiddenException("You can only edit your own notices.");
  }

  private async requireAuthorAccess(
    userId: string,
    centerId: string,
  ): Promise<AuthorAccess> {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, organizationId: true },
    });
    if (!center) throw new NotFoundException("Center not found.");

    const directorRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: { in: DIRECTOR_ROLE_NAMES } },
        OR: [
          { centerId: center.id },
          { organizationId: center.organizationId, centerId: null },
        ],
      },
    });
    if (directorRole) {
      return {
        level: "director",
        centerId: center.id,
        organizationId: center.organizationId,
      };
    }

    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: {
        teacherUserId: userId,
        endedAt: null,
        class: { centerId: center.id, status: "active" },
      },
      select: { classId: true },
    });
    if (assignments.length > 0) {
      return {
        level: "teacher",
        centerId: center.id,
        classIds: assignments.map((assignment) => assignment.classId),
      };
    }

    throw new ForbiddenException("Notice author access is required.");
  }

  private async assertTargetsAllowed(
    access: AuthorAccess,
    targetType: NoticeTargetType,
    targetIds: string[],
  ) {
    if (targetType === "center") {
      if (access.level !== "director") {
        throw new ForbiddenException(
          "Only directors can send center-wide notices.",
        );
      }
      return;
    }

    if (targetIds.length === 0) {
      throw new BadRequestException("Choose at least one recipient target.");
    }

    if (access.level === "teacher" && targetType === "class") {
      const allowed = new Set(access.classIds);
      if (targetIds.some((id) => !allowed.has(id))) {
        throw new ForbiddenException(
          "You can only target your assigned classes.",
        );
      }
    }

    const validCount = await this.prisma.childEnrollment.count({
      where:
        targetType === "class"
          ? {
              centerId: access.centerId,
              enrollmentStatus: "active",
              classId: {
                in:
                  access.level === "teacher"
                    ? targetIds.filter((id) => access.classIds.includes(id))
                    : targetIds,
              },
            }
          : {
              centerId: access.centerId,
              enrollmentStatus: "active",
              childId: { in: targetIds },
              classId:
                access.level === "teacher"
                  ? { in: access.classIds }
                  : undefined,
            },
    });

    if (validCount === 0) {
      throw new BadRequestException(
        "Choose an active audience for this notice.",
      );
    }

    if (access.level === "teacher" && targetType === "child") {
      const children = await this.prisma.childEnrollment.findMany({
        where: {
          centerId: access.centerId,
          enrollmentStatus: "active",
          childId: { in: targetIds },
          classId: { in: access.classIds },
        },
        select: { childId: true },
      });
      const allowedChildren = new Set(children.map((child) => child.childId));
      if (targetIds.some((id) => !allowedChildren.has(id))) {
        throw new ForbiddenException(
          "You can only target children in your assigned classes.",
        );
      }
    }
  }

  private async publishSideEffects(
    tx: Tx,
    notice: NoticePayload,
    actorUserId: string,
  ) {
    const recipients = await this.expandRecipients(tx, notice);
    if (recipients.length === 0) {
      throw new BadRequestException(
        "This notice has no parent recipients. Check the audience.",
      );
    }

    await tx.noticeRecipient.createMany({
      data: recipients.map((recipient) => ({
        noticeId: notice.id,
        userId: recipient.userId,
        childId: recipient.childId,
      })),
      skipDuplicates: true,
    });

    await Promise.all(
      [...new Set(recipients.map((recipient) => recipient.userId))].map(
        (userId) =>
          this.notifications.enqueue(
            {
              userId,
              notificationType: notice.requiresConfirmation
                ? "notice.confirmation_required"
                : "notice.published",
              title: notice.requiresConfirmation
                ? "Notice needs confirmation"
                : "New notice",
              body: notice.title,
              entityType: "notice",
              entityId: notice.id,
              channels: ["in_app", "push"],
            },
            tx,
          ),
      ),
    );

    await this.auditNotice(tx, notice, actorUserId, "notice.published", {
      recipientCount: recipients.length,
    });
  }

  private async expandRecipients(tx: Tx, notice: NoticePayload) {
    const targetIds = notice.targets.map((target) => target.targetId);
    const enrollments = await tx.childEnrollment.findMany({
      where: {
        centerId: notice.centerId,
        enrollmentStatus: "active",
        ...(notice.targetType === "class"
          ? { classId: { in: targetIds } }
          : notice.targetType === "child"
            ? { childId: { in: targetIds } }
            : {}),
      },
      include: { child: { include: { childGuardians: true } } },
    });

    const unique = new Map<string, { userId: string; childId: string }>();
    for (const enrollment of enrollments) {
      for (const guardian of enrollment.child.childGuardians) {
        unique.set(`${guardian.userId}:${enrollment.childId}`, {
          userId: guardian.userId,
          childId: enrollment.childId,
        });
      }
    }
    return [...unique.values()];
  }

  private async publishDueScheduledNotices() {
    const due = await this.prisma.notice.findMany({
      where: { status: "scheduled", scheduledAt: { lte: new Date() } },
      include: noticeInclude,
      take: 25,
    });

    for (const notice of due) {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.notice.update({
          where: { id: notice.id },
          data: { status: "published", publishedAt: new Date() },
          include: noticeInclude,
        });
        await this.publishSideEffects(tx, updated, notice.authorUserId);
      });
    }
  }

  private async toDetail(
    notice: NoticePayload,
    viewer?: { userId: string; childId?: string | null },
  ) {
    const summary = await this.toSummary(notice, viewer);
    return noticeDetailSchema.parse({
      ...summary,
      body: notice.body,
      recipients: notice.recipients.map((recipient) => {
        const childEnrollment = recipient.child?.childEnrollments[0];
        return {
          id: recipient.id,
          userId: recipient.userId,
          userName: recipient.user.fullName,
          childId: recipient.childId,
          childName: recipient.child ? childName(recipient.child) : null,
          classId: childEnrollment?.classId ?? null,
          className: childEnrollment?.class?.name ?? null,
          readAt: recipient.readAt?.toISOString() ?? null,
          confirmedAt: recipient.confirmedAt?.toISOString() ?? null,
          createdAt: recipient.createdAt.toISOString(),
        };
      }),
    });
  }

  private async toSummary(
    notice: NoticePayload,
    viewer?: { userId: string; childId?: string | null },
  ) {
    const targets = await this.targetLabels(notice);
    const viewerRecipients = viewer
      ? notice.recipients.filter(
          (recipient) =>
            recipient.userId === viewer.userId &&
            (viewer.childId === undefined ||
              recipient.childId === viewer.childId),
        )
      : [];
    const firstViewerRecipient = viewerRecipients[0];
    const childEnrollment = firstViewerRecipient?.child?.childEnrollments[0];

    return noticeSummarySchema.parse({
      id: notice.id,
      centerId: notice.centerId,
      centerName: notice.center.name,
      author: {
        id: notice.authorUser.id,
        fullName: notice.authorUser.fullName,
      },
      title: notice.title,
      bodyPreview:
        notice.body.length > 140
          ? `${notice.body.slice(0, 137)}...`
          : notice.body,
      kind: notice.kind,
      targetType: notice.targetType,
      targets,
      status: notice.status,
      requiresConfirmation: notice.requiresConfirmation,
      allowComments: notice.allowComments,
      isPinned: notice.isPinned,
      isImportant: notice.isImportant,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
      scheduledAt: notice.scheduledAt?.toISOString() ?? null,
      updatedAt: notice.updatedAt.toISOString(),
      recipientCount: notice.recipients.length,
      readCount: notice.recipients.filter((recipient) => recipient.readAt)
        .length,
      confirmedCount: notice.recipients.filter(
        (recipient) => recipient.confirmedAt,
      ).length,
      myReadAt: firstViewerRecipient?.readAt?.toISOString() ?? null,
      myConfirmedAt: firstViewerRecipient?.confirmedAt?.toISOString() ?? null,
      child: firstViewerRecipient?.child
        ? {
            id: firstViewerRecipient.child.id,
            name: childName(firstViewerRecipient.child),
            classId: childEnrollment?.classId ?? null,
            className: childEnrollment?.class?.name ?? null,
          }
        : null,
    });
  }

  private async targetLabels(notice: NoticePayload) {
    if (notice.targetType === "center") {
      return [
        { kind: "class" as const, id: notice.centerId, label: "Whole center" },
      ];
    }

    if (notice.targets.length === 0) return [];
    const ids = notice.targets.map((target) => target.targetId);
    if (notice.targetType === "class") {
      const classes = await this.prisma.class.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      return classes.map((klass) => ({
        kind: "class" as const,
        id: klass.id,
        label: klass.name,
      }));
    }

    const children = await this.prisma.child.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    return children.map((child) => ({
      kind: "child" as const,
      id: child.id,
      label: childName(child),
    }));
  }

  private auditNotice(
    tx: Tx | null,
    notice: NoticePayload,
    actorUserId: string,
    action: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.audit.log(
      {
        organizationId: notice.center.organizationId,
        centerId: notice.centerId,
        actorUserId,
        action,
        entityType: "notice",
        entityId: notice.id,
        metadata,
      },
      tx ?? undefined,
    );
  }
}

function targetRows(targetType: NoticeTargetType, ids: string[]) {
  if (targetType === "center") return [];
  return ids.map((targetId) => ({
    targetKind: targetType,
    targetId,
  }));
}

function parseDateTime(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Invalid date.");
  }
  return date;
}

function assertNoticeScheduleWindow(date: Date) {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  if (date.getTime() < now + tenMinutes) {
    throw new BadRequestException(
      "Schedule notices at least 10 minutes ahead.",
    );
  }
  if (date.getTime() > now + fourteenDays) {
    throw new BadRequestException("Schedule notices within 14 days.");
  }
}

function childName(child: { firstName: string; lastName?: string | null }) {
  return [child.firstName, child.lastName].filter(Boolean).join(" ");
}
