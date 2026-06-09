import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  dailyReportDetailSchema,
  dailyReportSummarySchema,
} from "@kichkintoy/shared";
import { PrismaService } from "../database/prisma.service";
import { withIdempotency } from "../common/idempotency";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  BulkDailyReportRequest,
  CreateDailyReportRequest,
  DailyReportCommentRequest,
  DailyReportItemInput,
  PublishDailyReportRequest,
  UpdateDailyReportRequest,
} from "@kichkintoy/shared";

type Tx = Prisma.TransactionClient;

const DIRECTOR_ROLE_NAMES = ["director", "organization_owner"];
const reportInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
  class: { select: { id: true, name: true } },
  child: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      dob: true,
      gender: true,
    },
  },
  authorUser: { select: { id: true, fullName: true } },
  items: { orderBy: { createdAt: "asc" } },
  reads: {
    include: {
      guardianUser: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  comments: {
    include: {
      authorUser: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.DailyReportInclude;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async listTeacherReports(userId: string, reportDate?: string) {
    await this.publishDueScheduledReports();
    const where = await this.staffReportWhere(userId);
    if (reportDate) where.reportDate = parseReportDate(reportDate);

    const reports = await this.prisma.dailyReport.findMany({
      where,
      include: reportInclude,
      orderBy: [{ reportDate: "desc" }, { updatedAt: "desc" }],
    });

    return Promise.all(reports.map((report) => this.toSummary(report)));
  }

  async listClassReportStatuses(
    userId: string,
    classId: string,
    reportDate?: string,
  ) {
    await this.publishDueScheduledReports();
    const date = parseReportDate(reportDate ?? todayIsoDate());
    await this.requireCanAuthorClass(userId, classId);

    const enrollments = await this.prisma.childEnrollment.findMany({
      where: { classId, enrollmentStatus: "active" },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            dob: true,
            gender: true,
          },
        },
      },
      orderBy: { startedAt: "asc" },
    });

    const reports = await this.prisma.dailyReport.findMany({
      where: {
        classId,
        reportDate: date,
        childId: { in: enrollments.map((enrollment) => enrollment.childId) },
      },
      include: reportInclude,
    });

    const byChild = new Map(reports.map((report) => [report.childId, report]));

    return Promise.all(
      enrollments.map(async (enrollment) => {
        const report = byChild.get(enrollment.childId);
        return {
          ...toChild(enrollment.child),
          report: report ? await this.toSummary(report) : null,
        };
      }),
    );
  }

  async createReport(userId: string, input: CreateDailyReportRequest) {
    const reportDate = parseReportDate(input.reportDate);
    assertNotFuture(reportDate);
    const enrollment = await this.requireActiveEnrollment(input.childId);
    await this.requireCanAuthorClass(userId, enrollment.classId);

    const status = input.scheduledAt
      ? "scheduled"
      : input.publish
        ? "published"
        : "draft";
    const scheduledAt = input.scheduledAt ? parseDateTime(input.scheduledAt) : null;
    if (scheduledAt && scheduledAt <= new Date()) {
      throw new BadRequestException("Scheduled time must be in the future.");
    }

    if (status !== "draft") {
      assertReportHasContent(input.teacherNote, input.healthNote, input.mood, input.items, input.photoAssetIds);
    }

    try {
      const report = await this.prisma.$transaction(async (tx) => {
        await this.requireMediaAssets(tx, enrollment.centerId, input.photoAssetIds);
        const created = await tx.dailyReport.create({
          data: {
            centerId: enrollment.centerId,
            classId: enrollment.classId,
            childId: input.childId,
            authorUserId: userId,
            reportDate,
            mood: clean(input.mood),
            healthNote: clean(input.healthNote),
            teacherNote: clean(input.teacherNote),
            status,
            scheduledAt,
            publishedAt: status === "published" ? new Date() : null,
            items: {
              create: normalizeItems(input.items),
            },
          },
          include: reportInclude,
        });

        await this.replacePhotoLinks(tx, created.id, input.photoAssetIds);

        await this.audit.log(
          {
            organizationId: created.center.organizationId,
            centerId: created.centerId,
            actorUserId: userId,
            action: "daily_report.created",
            entityType: "daily_report",
            entityId: created.id,
          },
          tx,
        );

        if (status === "published") {
          await this.createReadReceiptsAndNotify(tx, created);
          await this.audit.log(
            {
              organizationId: created.center.organizationId,
              centerId: created.centerId,
              actorUserId: userId,
              action: "daily_report.published",
              entityType: "daily_report",
              entityId: created.id,
            },
            tx,
          );
        }

        return created;
      });

      return this.getReportForStaff(userId, report.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "This child already has a report for that date.",
        );
      }
      throw error;
    }
  }

  async getReportForStaff(userId: string, reportId: string) {
    await this.publishDueScheduledReports();
    const report = await this.requireReport(reportId);
    await this.requireCanViewReportAsStaff(userId, report);
    return this.toDetail(report);
  }

  async updateReport(
    userId: string,
    reportId: string,
    input: UpdateDailyReportRequest,
  ) {
    const existing = await this.requireReport(reportId);
    await this.requireCanEditReport(userId, existing);

    const reportDate = input.reportDate
      ? parseReportDate(input.reportDate)
      : existing.reportDate;
    assertNotFuture(reportDate);

    if (input.photoAssetIds) {
      await this.requireMediaAssets(
        this.prisma,
        existing.centerId,
        input.photoAssetIds,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const report = await tx.dailyReport.update({
        where: { id: reportId },
        data: {
          reportDate,
          mood: input.mood !== undefined ? clean(input.mood) : undefined,
          healthNote:
            input.healthNote !== undefined ? clean(input.healthNote) : undefined,
          teacherNote:
            input.teacherNote !== undefined ? clean(input.teacherNote) : undefined,
        },
        include: reportInclude,
      });

      if (input.items) {
        await tx.dailyReportItem.deleteMany({ where: { dailyReportId: reportId } });
        if (input.items.length > 0) {
          await tx.dailyReportItem.createMany({
            data: normalizeItems(input.items).map((item) => ({
              ...item,
              dailyReportId: reportId,
            })),
          });
        }
      }

      if (input.photoAssetIds) {
        await this.replacePhotoLinks(tx, reportId, input.photoAssetIds);
      }

      await this.audit.log(
        {
          organizationId: existing.center.organizationId,
          centerId: existing.centerId,
          actorUserId: userId,
          action: "daily_report.updated",
          entityType: "daily_report",
          entityId: reportId,
        },
        tx,
      );

      return report;
    });

    return this.getReportForStaff(userId, updated.id);
  }

  async publishReport(
    userId: string,
    reportId: string,
    input: PublishDailyReportRequest,
  ) {
    const report = await this.requireReport(reportId);
    await this.requireCanPublishReport(userId, report);

    const scheduledAt = input.scheduledAt ? parseDateTime(input.scheduledAt) : null;
    if (scheduledAt && scheduledAt <= new Date()) {
      throw new BadRequestException("Scheduled time must be in the future.");
    }

    await this.assertStoredReportHasContent(report.id);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dailyReport.update({
        where: { id: report.id },
        data: scheduledAt
          ? { status: "scheduled", scheduledAt, publishedAt: null }
          : { status: "published", scheduledAt: null, publishedAt: new Date() },
        include: reportInclude,
      });

      if (!scheduledAt) {
        await this.createReadReceiptsAndNotify(tx, updated);
      }

      await this.audit.log(
        {
          organizationId: report.center.organizationId,
          centerId: report.centerId,
          actorUserId: userId,
          action: scheduledAt
            ? "daily_report.scheduled"
            : "daily_report.published",
          entityType: "daily_report",
          entityId: report.id,
        },
        tx,
      );
    });

    return this.getReportForStaff(userId, report.id);
  }

  async unpublishReport(userId: string, reportId: string) {
    const report = await this.requireReport(reportId);
    await this.requireCanPublishReport(userId, report);

    await this.prisma.$transaction(async (tx) => {
      await tx.dailyReport.update({
        where: { id: reportId },
        data: { status: "draft", publishedAt: null, scheduledAt: null },
      });
      await tx.dailyReportRead.deleteMany({ where: { dailyReportId: reportId } });
      await this.audit.log(
        {
          organizationId: report.center.organizationId,
          centerId: report.centerId,
          actorUserId: userId,
          action: "daily_report.unpublished",
          entityType: "daily_report",
          entityId: reportId,
        },
        tx,
      );
    });

    return this.getReportForStaff(userId, reportId);
  }

  async deleteReport(userId: string, reportId: string) {
    const report = await this.requireReport(reportId);
    await this.requireCanDeleteReport(userId, report);

    await this.prisma.$transaction(async (tx) => {
      await tx.mediaLink.deleteMany({
        where: { entityType: "daily_report", entityId: reportId },
      });
      await tx.dailyReport.delete({ where: { id: reportId } });
      await this.audit.log(
        {
          organizationId: report.center.organizationId,
          centerId: report.centerId,
          actorUserId: userId,
          action: "daily_report.deleted",
          entityType: "daily_report",
          entityId: reportId,
        },
        tx,
      );
    });

    return { success: true as const };
  }

  async bulkCreateDrafts(
    userId: string,
    classId: string,
    input: BulkDailyReportRequest,
  ) {
    const reportDate = parseReportDate(input.reportDate);
    assertNotFuture(reportDate);
    await this.requireCanAuthorClass(userId, classId);

    const enrollments = await this.prisma.childEnrollment.findMany({
      where: { classId, enrollmentStatus: "active" },
    });

    let created = 0;
    for (const enrollment of enrollments) {
      const existing = await this.prisma.dailyReport.findUnique({
        where: {
          childId_reportDate: {
            childId: enrollment.childId,
            reportDate,
          },
        },
      });
      if (existing) continue;
      await this.prisma.dailyReport.create({
        data: {
          centerId: enrollment.centerId,
          classId,
          childId: enrollment.childId,
          authorUserId: userId,
          reportDate,
          status: "draft",
        },
      });
      created += 1;
    }

    return { created, skipped: enrollments.length - created };
  }

  async publishClassDrafts(
    userId: string,
    classId: string,
    input: BulkDailyReportRequest,
  ) {
    const reportDate = parseReportDate(input.reportDate);
    await this.requireCanAuthorClass(userId, classId);

    const drafts = await this.prisma.dailyReport.findMany({
      where: { classId, reportDate, status: "draft" },
      include: reportInclude,
    });

    let published = 0;
    for (const report of drafts) {
      try {
        await this.assertStoredReportHasContent(report.id);
        await this.prisma.$transaction(async (tx) => {
          const updated = await tx.dailyReport.update({
            where: { id: report.id },
            data: { status: "published", publishedAt: new Date() },
            include: reportInclude,
          });
          await this.createReadReceiptsAndNotify(tx, updated);
          await this.audit.log(
            {
              organizationId: report.center.organizationId,
              centerId: report.centerId,
              actorUserId: userId,
              action: "daily_report.published",
              entityType: "daily_report",
              entityId: report.id,
            },
            tx,
          );
        });
        published += 1;
      } catch {
        // Empty drafts remain drafts; the class status view makes them visible.
      }
    }

    return { published, skipped: drafts.length - published };
  }

  async listReads(userId: string, reportId: string) {
    const report = await this.requireReport(reportId);
    await this.requireCanViewReportAsStaff(userId, report);
    return this.toReads(report);
  }

  async listParentChildren(userId: string) {
    const guardianships = await this.prisma.childGuardian.findMany({
      where: { userId },
      include: {
        child: {
          include: {
            childEnrollments: {
              where: { enrollmentStatus: "active" },
              include: {
                center: { select: { id: true, name: true } },
                class: { select: { id: true, name: true } },
              },
              orderBy: { startedAt: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return guardianships.map((guardianship) => {
      const enrollment = guardianship.child.childEnrollments[0];
      return {
        ...toChild(guardianship.child),
        centerId: enrollment?.center.id ?? "",
        centerName: enrollment?.center.name ?? "Center",
        classId: enrollment?.class?.id ?? null,
        className: enrollment?.class?.name ?? null,
      };
    });
  }

  async listParentReports(userId: string, childId: string) {
    await this.publishDueScheduledReports();
    await this.requireGuardian(userId, childId);

    const reports = await this.prisma.dailyReport.findMany({
      where: { childId, status: "published" },
      include: reportInclude,
      orderBy: [{ reportDate: "desc" }, { publishedAt: "desc" }],
    });

    return Promise.all(reports.map((report) => this.toSummary(report)));
  }

  async getReportForParent(userId: string, reportId: string) {
    await this.publishDueScheduledReports();
    const report = await this.requireReport(reportId);
    if (report.status !== "published") {
      throw new NotFoundException("Report not found.");
    }
    await this.requireGuardian(userId, report.childId);

    await this.prisma.dailyReportRead.upsert({
      where: {
        dailyReportId_guardianUserId: {
          dailyReportId: reportId,
          guardianUserId: userId,
        },
      },
      update: { readAt: new Date() },
      create: {
        dailyReportId: reportId,
        guardianUserId: userId,
        readAt: new Date(),
      },
    });

    return this.toDetail(await this.requireReport(reportId));
  }

  async addComment(
    userId: string,
    reportId: string,
    input: DailyReportCommentRequest,
  ) {
    const report = await this.requireReport(reportId);
    if (report.status !== "published") {
      throw new BadRequestException("Comments are only available after publish.");
    }

    const canStaff = await this.canViewReportAsStaff(userId, report);
    const canParent = await this.isGuardian(userId, report.childId);
    if (!canStaff && !canParent) {
      throw new ForbiddenException("You cannot comment on this report.");
    }

    if (input.parentCommentId) {
      const parent = await this.prisma.dailyReportComment.findUnique({
        where: { id: input.parentCommentId },
      });
      if (!parent || parent.dailyReportId !== report.id) {
        throw new BadRequestException("Parent comment not found.");
      }
    }

    // Dedupe offline replays: same client key returns the original comment.
    // Namespace by user so one author's key can never return another's result.
    const idemKey = input.idempotencyKey
      ? `comment:${userId}:${input.idempotencyKey}`
      : undefined;
    return withIdempotency(idemKey, async () => {
      const comment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.dailyReportComment.create({
          data: {
            dailyReportId: report.id,
            authorUserId: userId,
            parentCommentId: input.parentCommentId ?? null,
            body: input.body.trim(),
          },
          include: { authorUser: { select: { id: true, fullName: true } } },
        });

        await this.notifyNewComment(tx, report, userId);

        return created;
      });

      return {
        id: comment.id,
        authorUserId: comment.authorUserId,
        authorName: comment.authorUser.fullName,
        parentCommentId: comment.parentCommentId,
        body: comment.body,
        deletedAt: null,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      };
    });
  }

  async deleteComment(userId: string, reportId: string, commentId: string) {
    const comment = await this.prisma.dailyReportComment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.dailyReportId !== reportId) {
      throw new NotFoundException("Comment not found.");
    }
    if (comment.authorUserId !== userId) {
      throw new ForbiddenException("Only the comment author can delete it.");
    }

    await this.prisma.dailyReportComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date(), body: "" },
    });

    return { success: true as const };
  }

  private async requireReport(reportId: string) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: reportInclude,
    });
    if (!report) throw new NotFoundException("Report not found.");
    return report;
  }

  private async requireActiveEnrollment(childId: string) {
    const enrollment = await this.prisma.childEnrollment.findFirst({
      where: {
        childId,
        enrollmentStatus: "active",
        classId: { not: null },
        class: { status: "active" },
      },
      orderBy: { startedAt: "desc" },
    });
    if (!enrollment?.classId) {
      throw new BadRequestException("Child is not actively enrolled in a class.");
    }
    return { ...enrollment, classId: enrollment.classId };
  }

  private async staffReportWhere(userId: string): Promise<Prisma.DailyReportWhereInput> {
    const directorCenters = await this.directorCenterIds(userId);
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: { teacherUserId: userId, endedAt: null },
      select: { classId: true },
    });
    const classIds = assignments.map((assignment) => assignment.classId);

    if (directorCenters.length === 0 && classIds.length === 0) {
      return { id: "__none__" };
    }

    return {
      OR: [
        directorCenters.length > 0
          ? { centerId: { in: directorCenters } }
          : undefined,
        classIds.length > 0 ? { classId: { in: classIds } } : undefined,
      ].filter(Boolean) as Prisma.DailyReportWhereInput[],
    };
  }

  private async requireCanAuthorClass(userId: string, classId: string) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, centerId: true },
    });
    if (!klass) throw new NotFoundException("Class not found.");

    if (await this.isDirectorForCenter(userId, klass.centerId)) return klass;

    const assignment = await this.prisma.teacherClassAssignment.findFirst({
      where: { teacherUserId: userId, classId, endedAt: null },
    });
    if (!assignment) {
      throw new ForbiddenException("You are not assigned to this class.");
    }
    return klass;
  }

  private async requireCanViewReportAsStaff(userId: string, report: ReportPayload) {
    if (!(await this.canViewReportAsStaff(userId, report))) {
      throw new ForbiddenException("You cannot view this report.");
    }
  }

  private async canViewReportAsStaff(userId: string, report: ReportPayload) {
    if (await this.isDirectorForCenter(userId, report.centerId)) return true;
    const assignment = await this.prisma.teacherClassAssignment.findFirst({
      where: { teacherUserId: userId, classId: report.classId, endedAt: null },
    });
    return Boolean(assignment);
  }

  private async requireCanEditReport(userId: string, report: ReportPayload) {
    if (await this.isDirectorForCenter(userId, report.centerId)) return;
    if (report.authorUserId === userId) return;
    throw new ForbiddenException("Only the author or director can edit this report.");
  }

  private async requireCanPublishReport(userId: string, report: ReportPayload) {
    if (await this.isDirectorForCenter(userId, report.centerId)) return;
    if (report.authorUserId === userId) return;
    throw new ForbiddenException("Only the author or director can publish this report.");
  }

  private async requireCanDeleteReport(userId: string, report: ReportPayload) {
    if (await this.isDirectorForCenter(userId, report.centerId)) return;
    if (report.authorUserId === userId) return;
    throw new ForbiddenException("Only the author or director can delete this report.");
  }

  private async isDirectorForCenter(userId: string, centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, organizationId: true },
    });
    if (!center) return false;
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: { in: DIRECTOR_ROLE_NAMES } },
        OR: [
          { centerId: center.id },
          { organizationId: center.organizationId, centerId: null },
        ],
      },
    });
    return Boolean(role);
  }

  private async directorCenterIds(userId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: { name: { in: DIRECTOR_ROLE_NAMES } },
      },
      select: { centerId: true, organizationId: true },
    });

    const direct = roles
      .map((role) => role.centerId)
      .filter((id): id is string => Boolean(id));
    const orgIds = roles
      .filter((role) => !role.centerId && role.organizationId)
      .map((role) => role.organizationId as string);
    if (orgIds.length === 0) return direct;
    const orgCenters = await this.prisma.center.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true },
    });
    return [...direct, ...orgCenters.map((center) => center.id)];
  }

  private async requireGuardian(userId: string, childId: string) {
    const guardian = await this.prisma.childGuardian.findFirst({
      where: { userId, childId },
    });
    if (!guardian) {
      throw new ForbiddenException("You cannot access this child's reports.");
    }
    return guardian;
  }

  private async isGuardian(userId: string, childId: string) {
    const guardian = await this.prisma.childGuardian.findFirst({
      where: { userId, childId },
      select: { id: true },
    });
    return Boolean(guardian);
  }

  private async requireMediaAssets(
    tx: Tx | PrismaService,
    centerId: string,
    assetIds: string[] = [],
  ) {
    if (assetIds.length === 0) return;
    const count = await tx.mediaAsset.count({
      where: { id: { in: assetIds }, centerId },
    });
    if (count !== new Set(assetIds).size) {
      throw new BadRequestException("One or more photos were not found.");
    }
  }

  private async replacePhotoLinks(
    tx: Tx,
    reportId: string,
    assetIds: string[] = [],
  ) {
    await tx.mediaLink.deleteMany({
      where: { entityType: "daily_report", entityId: reportId },
    });
    if (assetIds.length === 0) return;
    await tx.mediaLink.createMany({
      data: [...new Set(assetIds)].map((assetId) => ({
        mediaAssetId: assetId,
        entityType: "daily_report",
        entityId: reportId,
      })),
    });
  }

  private async assertStoredReportHasContent(reportId: string) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { items: true },
    });
    if (!report) throw new NotFoundException("Report not found.");
    const photoCount = await this.prisma.mediaLink.count({
      where: { entityType: "daily_report", entityId: reportId },
    });
    assertReportHasContent(
      report.teacherNote,
      report.healthNote,
      report.mood,
      report.items,
      Array.from({ length: photoCount }, (_, index) => String(index)),
    );
  }

  private async createReadReceiptsAndNotify(tx: Tx, report: ReportPayload) {
    const guardians = await tx.childGuardian.findMany({
      where: { childId: report.childId },
      include: { user: { select: { id: true, fullName: true } } },
    });

    for (const guardian of guardians) {
      await tx.dailyReportRead.upsert({
        where: {
          dailyReportId_guardianUserId: {
            dailyReportId: report.id,
            guardianUserId: guardian.userId,
          },
        },
        update: {},
        create: {
          dailyReportId: report.id,
          guardianUserId: guardian.userId,
        },
      });
      await this.notifications.enqueue(
        {
          userId: guardian.userId,
          notificationType: "daily_report.published",
          title: "New daily report",
          body: `${report.child.firstName}'s daily report is ready.`,
          entityType: "daily_report",
          entityId: report.id,
          channels: ["in_app", "push"],
        },
        tx,
      );
    }
  }

  private async notifyNewComment(
    tx: Tx,
    report: ReportPayload,
    authorUserId: string,
  ) {
    const guardians = await tx.childGuardian.findMany({
      where: { childId: report.childId },
      select: { userId: true },
    });
    const recipients = new Set<string>([
      report.authorUserId,
      ...guardians.map((guardian) => guardian.userId),
    ]);
    recipients.delete(authorUserId);

    await Promise.all(
      [...recipients].map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: "daily_report.comment_created",
            title: "New report comment",
            body: `A new comment was added to ${report.child.firstName}'s report.`,
            entityType: "daily_report",
            entityId: report.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private async publishDueScheduledReports() {
    const dueReports = await this.prisma.dailyReport.findMany({
      where: { status: "scheduled", scheduledAt: { lte: new Date() } },
      include: reportInclude,
      take: 25,
    });
    for (const report of dueReports) {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.dailyReport.update({
          where: { id: report.id },
          data: { status: "published", publishedAt: new Date() },
          include: reportInclude,
        });
        await this.createReadReceiptsAndNotify(tx, updated);
        await this.audit.log(
          {
            organizationId: report.center.organizationId,
            centerId: report.centerId,
            actorUserId: report.authorUserId,
            action: "daily_report.published",
            entityType: "daily_report",
            entityId: report.id,
            metadata: { source: "scheduled_due_check" },
          },
          tx,
        );
      });
    }
  }

  private async toSummary(report: ReportPayload) {
    const photos = await this.photosForReport(report.id);
    const comments = report.comments.filter((comment) => !comment.deletedAt);
    return dailyReportSummarySchema.parse({
      id: report.id,
      child: toChild(report.child),
      class: report.class,
      author: {
        id: report.authorUser.id,
        fullName: report.authorUser.fullName,
      },
      reportDate: toIsoDate(report.reportDate),
      status: report.status,
      mood: report.mood,
      teacherNote: report.teacherNote,
      publishedAt: report.publishedAt?.toISOString() ?? null,
      scheduledAt: report.scheduledAt?.toISOString() ?? null,
      updatedAt: report.updatedAt.toISOString(),
      itemCount: report.items.length,
      photoCount: photos.length,
      commentCount: comments.length,
      readCount: report.reads.filter((read) => read.readAt).length,
      guardianCount: report.reads.length,
    });
  }

  private async toDetail(report: ReportPayload) {
    return dailyReportDetailSchema.parse({
      ...(await this.toSummary(report)),
      healthNote: report.healthNote,
      items: report.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        title: item.title,
        value: item.value,
        note: item.note,
        recordedAt: item.recordedAt?.toISOString() ?? null,
      })),
      photos: await this.photosForReport(report.id),
      reads: this.toReads(report),
      comments: report.comments.map((comment) => ({
        id: comment.id,
        authorUserId: comment.authorUserId,
        authorName: comment.authorUser.fullName,
        parentCommentId: comment.parentCommentId,
        body: comment.deletedAt ? "" : comment.body,
        deletedAt: comment.deletedAt?.toISOString() ?? null,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      })),
    });
  }

  private toReads(report: ReportPayload) {
    return report.reads.map((read) => ({
      id: read.id,
      guardianUserId: read.guardianUserId,
      guardianName: read.guardianUser.fullName,
      readAt: read.readAt?.toISOString() ?? null,
      createdAt: read.createdAt.toISOString(),
    }));
  }

  private async photosForReport(reportId: string) {
    const links = await this.prisma.mediaLink.findMany({
      where: { entityType: "daily_report", entityId: reportId },
      include: {
        mediaAsset: {
          select: {
            id: true,
            fileUrl: true,
            thumbnailUrl: true,
            mediaType: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return links.map((link) => link.mediaAsset);
  }
}

type ReportPayload = Prisma.DailyReportGetPayload<{ include: typeof reportInclude }>;

function normalizeItems(items: DailyReportItemInput[] = []) {
  return items
    .filter(
      (item) =>
        clean(item.title) ||
        clean(item.value) ||
        clean(item.note) ||
        item.itemType === "mood",
    )
    .map((item) => ({
      itemType: item.itemType,
      title: clean(item.title),
      value: clean(item.value),
      note: clean(item.note),
      recordedAt: item.recordedAt ? parseDateTime(item.recordedAt) : null,
    }));
}

function assertReportHasContent(
  teacherNote?: string | null,
  healthNote?: string | null,
  mood?: string | null,
  items: Array<unknown> = [],
  photoAssetIds: string[] = [],
) {
  if (
    clean(teacherNote) ||
    clean(healthNote) ||
    clean(mood) ||
    items.length > 0 ||
    photoAssetIds.length > 0
  ) {
    return;
  }
  throw new BadRequestException(
    "Add a teacher note, item, mood, health note, or photo before publishing.",
  );
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseReportDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Report date is invalid.");
  }
  return date;
}

function parseDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Date/time is invalid.");
  }
  return date;
}

function assertNotFuture(date: Date) {
  if (toIsoDate(date) > todayIsoDate()) {
    throw new BadRequestException("Report date cannot be in the future.");
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toChild(child: {
  id: string;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  dob: Date | null;
  gender: string | null;
}) {
  return {
    id: child.id,
    name: [child.firstName, child.lastName].filter(Boolean).join(" "),
    photoUrl: child.photoUrl,
    dateOfBirth: child.dob ? toIsoDate(child.dob) : null,
    gender: normalizeChildGender(child.gender),
  };
}

function normalizeChildGender(gender: string | null) {
  if (!gender) return null;
  if (gender === "boy" || gender === "girl" || gender === "prefer_not_to_say") {
    return gender;
  }
  if (gender === "male") return "boy";
  if (gender === "female") return "girl";
  return "prefer_not_to_say";
}
