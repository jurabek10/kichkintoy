import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  monthlyDevelopmentSummarySchema,
  monthlySubjectProgressListSchema,
  parentSpecialClassFeedItemSchema,
  parentSpecialClassFeedSchema,
  payrollReportSchema,
  portfolioExportSchema,
  specialClassCommentListSchema,
  specialClassCommentSchema,
  specialClassScheduleListSchema,
  specialClassScheduleSchema,
  specialClassSessionDetailSchema,
  specialClassSessionListSchema,
  specialClassSessionSummarySchema,
  specialSubjectListSchema,
  specialSubjectRubricListSchema,
  specialSubjectSchema,
  specialistTeacherListSchema,
  specialistTeacherSchema,
  type AddSpecialCommentInput,
  type AttachSpecialMediaInput,
  type CreatePortfolioExportInput,
  type CreateSpecialistTeacherInput,
  type CreateSpecialScheduleInput,
  type CreateSpecialSessionInput,
  type CreateSpecialSubjectInput,
  type GenerateAiSummaryInput,
  type MonthlyProgressInput,
  type PayrollReportInput,
  type UpdateDevelopmentSummaryInput,
  type UpdateSessionPayrollInput,
  type UpdateSpecialistTeacherInput,
  type UpdateSpecialScheduleInput,
  type UpdateSpecialSessionInput,
  type UpdateSpecialSubjectInput,
  type UpsertSpecialObservationInput,
  type UpsertSpecialRubricInput,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { MediaService } from "../media/media.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const scheduleInclude = {
  class: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true } },
  specialistTeacher: { select: { id: true, fullName: true } },
} satisfies Prisma.SpecialClassScheduleInclude;

const sessionInclude = {
  class: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true } },
  specialistTeacher: { select: { id: true, fullName: true } },
  observations: {
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "desc" },
  },
  media: {
    include: {
      mediaAsset: {
        select: { id: true, mediaType: true, mimeType: true, createdAt: true },
      },
      children: { select: { childId: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.SpecialClassSessionInclude;

type SchedulePayload = Prisma.SpecialClassScheduleGetPayload<{
  include: typeof scheduleInclude;
}>;
type SessionPayload = Prisma.SpecialClassSessionGetPayload<{
  include: typeof sessionInclude;
}>;

@Injectable()
export class SpecialClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
  ) {}

  async subjects(userId: string, input: { centerId: string }) {
    await this.requireStaffScope(userId, input.centerId);
    const subjects = await this.prisma.specialSubject.findMany({
      where: { centerId: input.centerId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return specialSubjectListSchema.parse(subjects.map(toSubject));
  }

  async createSubject(userId: string, input: CreateSpecialSubjectInput) {
    const center = await this.requireDirector(userId, input.centerId);
    const subject = await this.prisma.specialSubject.create({
      data: {
        centerId: input.centerId,
        createdByUserId: userId,
        name: clean(input.name),
        description: emptyToNull(input.description),
        color: emptyToNull(input.color),
        icon: emptyToNull(input.icon),
      },
    });
    await this.audit.log({
      organizationId: center.organizationId,
      centerId: input.centerId,
      actorUserId: userId,
      action: "special_class.subject_created",
      entityType: "special_subject",
      entityId: subject.id,
    });
    return specialSubjectSchema.parse(toSubject(subject));
  }

  async updateSubject(userId: string, input: UpdateSpecialSubjectInput) {
    const existing = await this.findSubject(input.subjectId);
    const center = await this.requireDirector(userId, existing.centerId);
    const subject = await this.prisma.specialSubject.update({
      where: { id: existing.id },
      data: {
        ...(input.body.name !== undefined ? { name: clean(input.body.name) } : {}),
        ...(input.body.description !== undefined
          ? { description: emptyToNull(input.body.description) }
          : {}),
        ...(input.body.color !== undefined
          ? { color: emptyToNull(input.body.color) }
          : {}),
        ...(input.body.icon !== undefined ? { icon: emptyToNull(input.body.icon) } : {}),
        ...(input.body.status !== undefined ? { status: input.body.status } : {}),
      },
    });
    await this.audit.log({
      organizationId: center.organizationId,
      centerId: existing.centerId,
      actorUserId: userId,
      action: "special_class.subject_updated",
      entityType: "special_subject",
      entityId: subject.id,
    });
    return specialSubjectSchema.parse(toSubject(subject));
  }

  async archiveSubject(userId: string, subjectId: string) {
    return this.updateSubject(userId, {
      subjectId,
      body: { status: "archived" },
    });
  }

  async specialists(userId: string, input: { centerId: string }) {
    await this.requireStaffScope(userId, input.centerId);
    const specialists = await this.prisma.specialistTeacher.findMany({
      where: { centerId: input.centerId },
      orderBy: [{ status: "asc" }, { fullName: "asc" }],
    });
    return specialistTeacherListSchema.parse(specialists.map(toSpecialist));
  }

  async createSpecialist(userId: string, input: CreateSpecialistTeacherInput) {
    const center = await this.requireDirector(userId, input.centerId);
    const specialist = await this.prisma.specialistTeacher.create({
      data: {
        centerId: input.centerId,
        fullName: clean(input.fullName),
        phone: emptyToNull(input.phone),
        notes: emptyToNull(input.notes),
      },
    });
    await this.audit.log({
      organizationId: center.organizationId,
      centerId: input.centerId,
      actorUserId: userId,
      action: "special_class.specialist_created",
      entityType: "specialist_teacher",
      entityId: specialist.id,
    });
    return specialistTeacherSchema.parse(toSpecialist(specialist));
  }

  async updateSpecialist(userId: string, input: UpdateSpecialistTeacherInput) {
    const existing = await this.findSpecialist(input.specialistTeacherId);
    const center = await this.requireDirector(userId, existing.centerId);
    const specialist = await this.prisma.specialistTeacher.update({
      where: { id: existing.id },
      data: {
        ...(input.body.fullName !== undefined
          ? { fullName: clean(input.body.fullName) }
          : {}),
        ...(input.body.phone !== undefined
          ? { phone: emptyToNull(input.body.phone) }
          : {}),
        ...(input.body.notes !== undefined
          ? { notes: emptyToNull(input.body.notes) }
          : {}),
        ...(input.body.status !== undefined ? { status: input.body.status } : {}),
      },
    });
    await this.audit.log({
      organizationId: center.organizationId,
      centerId: existing.centerId,
      actorUserId: userId,
      action: "special_class.specialist_updated",
      entityType: "specialist_teacher",
      entityId: specialist.id,
    });
    return specialistTeacherSchema.parse(toSpecialist(specialist));
  }

  async archiveSpecialist(userId: string, specialistTeacherId: string) {
    return this.updateSpecialist(userId, {
      specialistTeacherId,
      body: { status: "archived" },
    });
  }

  async rubrics(
    userId: string,
    input: { centerId: string; subjectId?: string; ageGroup?: string },
  ) {
    await this.requireStaffScope(userId, input.centerId);
    const rubrics = await this.prisma.specialSubjectRubric.findMany({
      where: {
        centerId: input.centerId,
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        ...(input.ageGroup ? { ageGroup: input.ageGroup } : {}),
      },
      orderBy: [{ subjectId: "asc" }, { ageGroup: "asc" }, { displayOrder: "asc" }],
    });
    return specialSubjectRubricListSchema.parse(rubrics.map(toRubric));
  }

  async upsertRubric(userId: string, input: UpsertSpecialRubricInput) {
    await this.requireDirector(userId, input.centerId);
    const subject = await this.findSubject(input.subjectId);
    if (subject.centerId !== input.centerId) {
      throw new BadRequestException("Subject is outside this center.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.specialSubjectRubric.deleteMany({
        where: {
          centerId: input.centerId,
          subjectId: input.subjectId,
          ageGroup: input.ageGroup,
        },
      });
      await tx.specialSubjectRubric.createMany({
        data: input.skills.map((skill, index) => ({
          centerId: input.centerId,
          subjectId: input.subjectId,
          ageGroup: clean(input.ageGroup),
          skillKey: clean(skill.skillKey),
          skillLabel: clean(skill.skillLabel),
          description: emptyToNull(skill.description),
          displayOrder: skill.displayOrder ?? index,
        })),
      });
    });
    return this.rubrics(userId, {
      centerId: input.centerId,
      subjectId: input.subjectId,
      ageGroup: input.ageGroup,
    });
  }

  async schedules(
    userId: string,
    input: { centerId: string; classId?: string; status?: string },
  ) {
    const scope = await this.requireStaffScope(userId, input.centerId);
    const classIdFilter = input.classId
      ? [input.classId]
      : scope.director
        ? undefined
        : scope.classIds;
    const schedules = await this.prisma.specialClassSchedule.findMany({
      where: {
        centerId: input.centerId,
        ...(classIdFilter ? { classId: { in: classIdFilter } } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: scheduleInclude,
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });
    return specialClassScheduleListSchema.parse(schedules.map(toSchedule));
  }

  async createSchedule(userId: string, input: CreateSpecialScheduleInput) {
    await this.requireDirector(userId, input.centerId);
    await this.assertCenterObjects(input.centerId, {
      classId: input.classId,
      subjectId: input.subjectId,
      specialistTeacherId: input.specialistTeacherId,
    });
    const schedule = await this.prisma.specialClassSchedule.create({
      data: {
        centerId: input.centerId,
        classId: input.classId,
        subjectId: input.subjectId,
        specialistTeacherId: input.specialistTeacherId ?? null,
        weekday: input.weekday,
        startTime: parseTime(input.startTime),
        endTime: parseTime(input.endTime),
        startDate: parseDate(input.startDate),
        endDate: input.endDate ? parseDate(input.endDate) : null,
        payrollType: input.payrollType,
        payrollAmount: input.payrollAmount,
        createdByUserId: userId,
      },
      include: scheduleInclude,
    });
    return specialClassScheduleSchema.parse(toSchedule(schedule));
  }

  async updateSchedule(userId: string, input: UpdateSpecialScheduleInput) {
    const existing = await this.findSchedule(input.scheduleId);
    await this.requireDirector(userId, existing.centerId);
    await this.assertCenterObjects(existing.centerId, {
      classId: input.body.classId,
      subjectId: input.body.subjectId,
      specialistTeacherId: input.body.specialistTeacherId,
    });
    const schedule = await this.prisma.specialClassSchedule.update({
      where: { id: existing.id },
      data: {
        ...(input.body.classId !== undefined ? { classId: input.body.classId } : {}),
        ...(input.body.subjectId !== undefined
          ? { subjectId: input.body.subjectId }
          : {}),
        ...(input.body.specialistTeacherId !== undefined
          ? { specialistTeacherId: input.body.specialistTeacherId ?? null }
          : {}),
        ...(input.body.weekday !== undefined ? { weekday: input.body.weekday } : {}),
        ...(input.body.startTime !== undefined
          ? { startTime: parseTime(input.body.startTime) }
          : {}),
        ...(input.body.endTime !== undefined
          ? { endTime: parseTime(input.body.endTime) }
          : {}),
        ...(input.body.startDate !== undefined
          ? { startDate: parseDate(input.body.startDate) }
          : {}),
        ...(input.body.endDate !== undefined
          ? { endDate: input.body.endDate ? parseDate(input.body.endDate) : null }
          : {}),
        ...(input.body.status !== undefined ? { status: input.body.status } : {}),
        ...(input.body.payrollType !== undefined
          ? { payrollType: input.body.payrollType }
          : {}),
        ...(input.body.payrollAmount !== undefined
          ? { payrollAmount: input.body.payrollAmount }
          : {}),
      },
      include: scheduleInclude,
    });
    return specialClassScheduleSchema.parse(toSchedule(schedule));
  }

  async archiveSchedule(userId: string, scheduleId: string) {
    return this.updateSchedule(userId, {
      scheduleId,
      body: { status: "archived" },
    });
  }

  async staffSessions(
    userId: string,
    input: {
      centerId: string;
      classId?: string;
      from?: string;
      to?: string;
      status?: string;
    },
  ) {
    const scope = await this.requireStaffScope(userId, input.centerId);
    const classIds = input.classId
      ? [input.classId]
      : scope.director
        ? undefined
        : scope.classIds;
    const sessions = await this.prisma.specialClassSession.findMany({
      where: {
        centerId: input.centerId,
        ...(classIds ? { classId: { in: classIds } } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.from || input.to
          ? {
              sessionDate: {
                ...(input.from ? { gte: parseDate(input.from) } : {}),
                ...(input.to ? { lte: parseDate(input.to) } : {}),
              },
            }
          : {}),
      },
      include: sessionInclude,
      orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
    });
    return specialClassSessionListSchema.parse(sessions.map(toSessionSummary));
  }

  async sessionDetail(userId: string, sessionId: string) {
    const session = await this.findSession(sessionId);
    await this.requireClassAccess(userId, session.centerId, session.classId);
    return specialClassSessionDetailSchema.parse(toSessionDetail(session));
  }

  async createSession(userId: string, input: CreateSpecialSessionInput) {
    await this.requireTeacherClassAccess(userId, input.centerId, input.classId);
    await this.assertCenterObjects(input.centerId, {
      classId: input.classId,
      subjectId: input.subjectId,
      specialistTeacherId: input.specialistTeacherId,
      scheduleId: input.scheduleId,
    });
    const session = await this.prisma.specialClassSession.create({
      data: {
        centerId: input.centerId,
        classId: input.classId,
        subjectId: input.subjectId,
        scheduleId: input.scheduleId ?? null,
        specialistTeacherId: input.specialistTeacherId ?? null,
        sessionDate: parseDate(input.sessionDate),
        title: clean(input.title),
        classSummary: emptyToNull(input.classSummary),
        specialistAttendanceStatus: input.specialistAttendanceStatus,
        payrollAmount: input.payrollAmount,
        createdByUserId: userId,
      },
      include: sessionInclude,
    });
    await this.audit.log({
      centerId: input.centerId,
      actorUserId: userId,
      action: "special_class.session_created",
      entityType: "special_class_session",
      entityId: session.id,
    });
    return specialClassSessionDetailSchema.parse(toSessionDetail(session));
  }

  async updateSession(userId: string, input: UpdateSpecialSessionInput) {
    const existing = await this.findSession(input.sessionId);
    await this.requireTeacherClassAccess(
      userId,
      existing.centerId,
      existing.classId,
    );
    await this.assertCenterObjects(existing.centerId, {
      classId: input.body.classId,
      subjectId: input.body.subjectId,
      specialistTeacherId: input.body.specialistTeacherId,
      scheduleId: input.body.scheduleId,
    });
    const session = await this.prisma.specialClassSession.update({
      where: { id: existing.id },
      data: {
        ...(input.body.classId !== undefined ? { classId: input.body.classId } : {}),
        ...(input.body.subjectId !== undefined
          ? { subjectId: input.body.subjectId }
          : {}),
        ...(input.body.scheduleId !== undefined
          ? { scheduleId: input.body.scheduleId ?? null }
          : {}),
        ...(input.body.specialistTeacherId !== undefined
          ? { specialistTeacherId: input.body.specialistTeacherId ?? null }
          : {}),
        ...(input.body.sessionDate !== undefined
          ? { sessionDate: parseDate(input.body.sessionDate) }
          : {}),
        ...(input.body.title !== undefined ? { title: clean(input.body.title) } : {}),
        ...(input.body.classSummary !== undefined
          ? { classSummary: emptyToNull(input.body.classSummary) }
          : {}),
        ...(input.body.specialistAttendanceStatus !== undefined
          ? { specialistAttendanceStatus: input.body.specialistAttendanceStatus }
          : {}),
        ...(input.body.payrollStatus !== undefined
          ? { payrollStatus: input.body.payrollStatus }
          : {}),
        ...(input.body.payrollAmount !== undefined
          ? { payrollAmount: input.body.payrollAmount }
          : {}),
        ...(input.body.status !== undefined ? { status: input.body.status } : {}),
        updatedByUserId: userId,
      },
      include: sessionInclude,
    });
    return specialClassSessionDetailSchema.parse(toSessionDetail(session));
  }

  async publishSession(userId: string, sessionId: string) {
    const existing = await this.findSession(sessionId);
    await this.requireTeacherClassAccess(
      userId,
      existing.centerId,
      existing.classId,
    );
    const session = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.specialClassSession.update({
        where: { id: existing.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          updatedByUserId: userId,
        },
        include: sessionInclude,
      });
      await this.notifyPublished(tx, updated.id);
      return updated;
    });
    return specialClassSessionDetailSchema.parse(toSessionDetail(session));
  }

  async cancelSession(userId: string, sessionId: string) {
    const existing = await this.findSession(sessionId);
    await this.requireTeacherClassAccess(
      userId,
      existing.centerId,
      existing.classId,
    );
    const session = await this.prisma.specialClassSession.update({
      where: { id: existing.id },
      data: { status: "cancelled", updatedByUserId: userId },
      include: sessionInclude,
    });
    return specialClassSessionDetailSchema.parse(toSessionDetail(session));
  }

  async upsertChildObservations(
    userId: string,
    input: UpsertSpecialObservationInput,
  ) {
    const existing = await this.findSession(input.sessionId);
    await this.requireTeacherClassAccess(
      userId,
      existing.centerId,
      existing.classId,
    );
    const allowedChildIds = await this.classChildIds(existing.classId);
    const invalid = input.observations.find(
      (item) => !allowedChildIds.includes(item.childId),
    );
    if (invalid) {
      throw new BadRequestException("One or more children are outside this class.");
    }
    const session = await this.prisma.$transaction(async (tx) => {
      for (const observation of input.observations) {
        await tx.specialClassChildObservation.upsert({
          where: {
            sessionId_childId: {
              sessionId: existing.id,
              childId: observation.childId,
            },
          },
          create: {
            sessionId: existing.id,
            childId: observation.childId,
            participation: observation.participation,
            progressLevel: observation.progressLevel,
            interestLevel: observation.interestLevel,
            strongSkillKeys:
              observation.strongSkillKeys as Prisma.InputJsonValue,
            needsPracticeSkillKeys:
              observation.needsPracticeSkillKeys as Prisma.InputJsonValue,
            teacherNote: emptyToNull(observation.teacherNote),
            homePractice: emptyToNull(observation.homePractice),
            visibleToParent: observation.visibleToParent,
          },
          update: {
            participation: observation.participation,
            progressLevel: observation.progressLevel,
            interestLevel: observation.interestLevel,
            strongSkillKeys:
              observation.strongSkillKeys as Prisma.InputJsonValue,
            needsPracticeSkillKeys:
              observation.needsPracticeSkillKeys as Prisma.InputJsonValue,
            teacherNote: emptyToNull(observation.teacherNote),
            homePractice: emptyToNull(observation.homePractice),
            visibleToParent: observation.visibleToParent,
          },
        });
      }
      return tx.specialClassSession.findUniqueOrThrow({
        where: { id: existing.id },
        include: sessionInclude,
      });
    });
    return specialClassSessionDetailSchema.parse(toSessionDetail(session));
  }

  async attachMedia(userId: string, input: AttachSpecialMediaInput) {
    const existing = await this.findSession(input.sessionId);
    await this.requireTeacherClassAccess(
      userId,
      existing.centerId,
      existing.classId,
    );
    const childIds = input.childIds ?? [];
    if (childIds.length > 0) {
      const allowedChildIds = await this.classChildIds(existing.classId);
      if (childIds.some((childId) => !allowedChildIds.includes(childId))) {
        throw new BadRequestException("One or more media tags are outside this class.");
      }
    }
    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: input.mediaAssetIds }, centerId: existing.centerId },
    });
    if (assets.length !== input.mediaAssetIds.length) {
      throw new BadRequestException("One or more media assets are invalid.");
    }
    const session = await this.prisma.$transaction(async (tx) => {
      for (const mediaAssetId of input.mediaAssetIds) {
        const media = await tx.specialClassSessionMedia.upsert({
          where: {
            sessionId_mediaAssetId: {
              sessionId: existing.id,
              mediaAssetId,
            },
          },
          create: {
            sessionId: existing.id,
            mediaAssetId,
            visibility: input.visibility,
            fieldNote: emptyToNull(input.fieldNote),
          },
          update: {
            visibility: input.visibility,
            fieldNote: emptyToNull(input.fieldNote),
          },
        });
        await tx.specialClassMediaChild.deleteMany({
          where: { sessionMediaId: media.id },
        });
        if (childIds.length > 0) {
          await tx.specialClassMediaChild.createMany({
            data: childIds.map((childId) => ({
              sessionMediaId: media.id,
              childId,
            })),
            skipDuplicates: true,
          });
        }
      }
      return tx.specialClassSession.findUniqueOrThrow({
        where: { id: existing.id },
        include: sessionInclude,
      });
    });
    return specialClassSessionDetailSchema.parse(toSessionDetail(session));
  }

  async parentFeed(
    userId: string,
    input: { childId?: string; from?: string; to?: string },
  ) {
    const access = await this.parentChildAccess(userId, input.childId);
    if (access.childIds.length === 0) return [];
    const sessions = await this.prisma.specialClassSession.findMany({
      where: {
        status: "published",
        classId: { in: access.classIds },
        ...(input.from || input.to
          ? {
              sessionDate: {
                ...(input.from ? { gte: parseDate(input.from) } : {}),
                ...(input.to ? { lte: parseDate(input.to) } : {}),
              },
            }
          : {}),
        observations: {
          some: { childId: { in: access.childIds }, visibleToParent: true },
        },
      },
      include: sessionInclude,
      orderBy: [{ sessionDate: "desc" }, { publishedAt: "desc" }],
    });
    const items = await Promise.all(
      sessions.flatMap((session) =>
        access.childIds.map(async (childId) => {
          const observation =
            session.observations.find(
              (item) => item.childId === childId && item.visibleToParent,
            ) ?? null;
          if (!observation) return null;
          const commentsCount = await this.prisma.specialClassComment.count({
            where: { sessionId: session.id, childId, deletedAt: null },
          });
          return {
            session: toSessionSummary(session),
            observation: toObservation(observation),
            media: visibleMediaForChild(session, childId),
            commentsCount,
          };
        }),
      ),
    );
    return parentSpecialClassFeedSchema.parse(items.filter(Boolean));
  }

  async parentSessionDetail(userId: string, sessionId: string, childId: string) {
    const access = await this.parentChildAccess(userId, childId);
    if (!access.childIds.includes(childId)) {
      throw new ForbiddenException("You cannot view this child.");
    }
    const session = await this.findSession(sessionId);
    if (session.status !== "published" || !access.classIds.includes(session.classId)) {
      throw new ForbiddenException("You cannot view this session.");
    }
    const observation =
      session.observations.find(
        (item) => item.childId === childId && item.visibleToParent,
      ) ?? null;
    if (!observation) throw new ForbiddenException("No visible observation.");
    const commentsCount = await this.prisma.specialClassComment.count({
      where: { sessionId, childId, deletedAt: null },
    });
    return parentSpecialClassFeedItemSchema.parse({
      session: toSessionSummary(session),
      observation: toObservation(observation),
      media: visibleMediaForChild(session, childId),
      commentsCount,
    });
  }

  async comments(userId: string, input: { sessionId: string; childId: string }) {
    await this.requireCommentAccess(userId, input.sessionId, input.childId);
    const comments = await this.prisma.specialClassComment.findMany({
      where: {
        sessionId: input.sessionId,
        childId: input.childId,
        deletedAt: null,
      },
      include: { authorUser: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return specialClassCommentListSchema.parse(comments.map(toComment));
  }

  async addComment(userId: string, input: AddSpecialCommentInput) {
    const session = await this.requireCommentAccess(
      userId,
      input.sessionId,
      input.childId,
    );
    const comment = await this.prisma.specialClassComment.create({
      data: {
        sessionId: input.sessionId,
        childId: input.childId,
        authorUserId: userId,
        body: clean(input.body),
      },
      include: { authorUser: { select: { id: true, fullName: true } } },
    });
    await this.notifyComment(session, input.childId, userId);
    return specialClassCommentSchema.parse(toComment(comment));
  }

  async monthlyProgress(userId: string, input: MonthlyProgressInput) {
    await this.requireChildVisibility(userId, input.childId);
    const progress = await this.buildMonthlyProgress(input.childId, input.month);
    return monthlySubjectProgressListSchema.parse(progress);
  }

  async generateAiSummary(userId: string, input: GenerateAiSummaryInput) {
    const child = await this.requireStaffForChild(userId, input.childId);
    const progress = await this.buildMonthlyProgress(input.childId, input.month);
    const text = draftSummaryText(child.childName, progress, input.language);
    const summary = await this.prisma.monthlyDevelopmentSummary.upsert({
      where: { childId_month: { childId: input.childId, month: input.month } },
      create: {
        centerId: child.centerId,
        childId: input.childId,
        month: input.month,
        status: "staff_review",
        structuredSummary: progress as Prisma.InputJsonValue,
        aiSummaryText: text,
        aiProvider: "local-rule",
        aiModel: "progress-summary-v1",
        generatedAt: new Date(),
      },
      update: {
        status: "staff_review",
        structuredSummary: progress as Prisma.InputJsonValue,
        aiSummaryText: text,
        aiProvider: "local-rule",
        aiModel: "progress-summary-v1",
        generatedAt: new Date(),
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return monthlyDevelopmentSummarySchema.parse(toSummary(summary));
  }

  async updateSummaryDraft(userId: string, input: UpdateDevelopmentSummaryInput) {
    const existing = await this.findSummary(input.summaryId);
    await this.requireStaffForChild(userId, existing.childId);
    const summary = await this.prisma.monthlyDevelopmentSummary.update({
      where: { id: existing.id },
      data: {
        staffEditedSummaryText: clean(input.body.staffEditedSummaryText),
        status: "staff_review",
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return monthlyDevelopmentSummarySchema.parse(toSummary(summary));
  }

  async approveSummary(userId: string, input: UpdateDevelopmentSummaryInput) {
    const existing = await this.findSummary(input.summaryId);
    await this.requireStaffForChild(userId, existing.childId);
    const approvedText =
      clean(input.body.staffEditedSummaryText) ||
      existing.staffEditedSummaryText ||
      existing.aiSummaryText;
    if (!approvedText) {
      throw new BadRequestException("Summary text is required.");
    }
    const summary = await this.prisma.monthlyDevelopmentSummary.update({
      where: { id: existing.id },
      data: {
        staffEditedSummaryText: clean(input.body.staffEditedSummaryText),
        approvedSummaryText: approvedText,
        status: "approved",
        approvedByUserId: userId,
        approvedAt: new Date(),
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return monthlyDevelopmentSummarySchema.parse(toSummary(summary));
  }

  async createPdfPortfolio(userId: string, input: CreatePortfolioExportInput) {
    const child = await this.requireStaffForChild(userId, input.childId);
    const exportRow = await this.prisma.developmentPortfolioExport.create({
      data: {
        centerId: child.centerId,
        childId: input.childId,
        month: input.month,
        termLabel: emptyToNull(input.termLabel),
        generatedByUserId: userId,
        status: "ready",
        generatedAt: new Date(),
      },
    });
    return portfolioExportSchema.parse(toPortfolioExport(exportRow));
  }

  async portfolioDownloadUrl(userId: string, exportId: string) {
    const exportRow = await this.prisma.developmentPortfolioExport.findUnique({
      where: { id: exportId },
    });
    if (!exportRow) throw new NotFoundException("Portfolio export not found.");
    await this.requireChildVisibility(userId, exportRow.childId);
    if (!exportRow.mediaAssetId) {
      throw new BadRequestException("PDF generation is not attached yet.");
    }
    return this.media.getDownloadUrl(userId, exportRow.mediaAssetId);
  }

  async payrollReport(userId: string, input: PayrollReportInput) {
    await this.requireDirector(userId, input.centerId);
    const { from, to } = monthRange(input.month);
    const sessions = await this.prisma.specialClassSession.findMany({
      where: {
        centerId: input.centerId,
        sessionDate: { gte: from, lte: to },
      },
      include: {
        subject: { select: { name: true } },
        specialistTeacher: { select: { id: true, fullName: true } },
      },
    });
    const rows = new Map<string, {
      specialistTeacherId: string | null;
      specialistTeacherName: string;
      subjectName: string;
      completedSessions: number;
      cancelledSessions: number;
      totalAmount: number;
      approvedAmount: number;
      paidAmount: number;
    }>();
    for (const session of sessions) {
      const key = `${session.specialistTeacherId ?? "none"}:${session.subjectId}`;
      const row =
        rows.get(key) ??
        {
          specialistTeacherId: session.specialistTeacherId,
          specialistTeacherName:
            session.specialistTeacher?.fullName ?? "Unassigned specialist",
          subjectName: session.subject.name,
          completedSessions: 0,
          cancelledSessions: 0,
          totalAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
        };
      if (session.status === "cancelled") row.cancelledSessions += 1;
      else row.completedSessions += 1;
      row.totalAmount += session.payrollAmount;
      if (session.payrollStatus === "approved") {
        row.approvedAmount += session.payrollAmount;
      }
      if (session.payrollStatus === "paid") row.paidAmount += session.payrollAmount;
      rows.set(key, row);
    }
    return payrollReportSchema.parse([...rows.values()]);
  }

  async updateSessionPayroll(userId: string, input: UpdateSessionPayrollInput) {
    const existing = await this.findSession(input.sessionId);
    await this.requireDirector(userId, existing.centerId);
    const session = await this.prisma.specialClassSession.update({
      where: { id: existing.id },
      data: {
        payrollStatus: input.payrollStatus,
        ...(input.payrollAmount !== undefined
          ? { payrollAmount: input.payrollAmount }
          : {}),
      },
      include: sessionInclude,
    });
    return specialClassSessionSummarySchema.parse(toSessionSummary(session));
  }

  private async findSubject(subjectId: string) {
    const subject = await this.prisma.specialSubject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException("Special subject not found.");
    return subject;
  }

  private async findSpecialist(specialistTeacherId: string) {
    const specialist = await this.prisma.specialistTeacher.findUnique({
      where: { id: specialistTeacherId },
    });
    if (!specialist) throw new NotFoundException("Specialist teacher not found.");
    return specialist;
  }

  private async findSchedule(scheduleId: string) {
    const schedule = await this.prisma.specialClassSchedule.findUnique({
      where: { id: scheduleId },
      include: scheduleInclude,
    });
    if (!schedule) throw new NotFoundException("Special class schedule not found.");
    return schedule;
  }

  private async findSession(sessionId: string) {
    const session = await this.prisma.specialClassSession.findUnique({
      where: { id: sessionId },
      include: sessionInclude,
    });
    if (!session) throw new NotFoundException("Special class session not found.");
    return session;
  }

  private async findSummary(summaryId: string) {
    const summary = await this.prisma.monthlyDevelopmentSummary.findUnique({
      where: { id: summaryId },
    });
    if (!summary) throw new NotFoundException("Development summary not found.");
    return summary;
  }

  private async requireDirector(userId: string, centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, organizationId: true },
    });
    if (!center) throw new ForbiddenException("Center not found.");
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: { in: ["director", "organization_owner"] } },
        OR: [
          { centerId },
          { organizationId: center.organizationId, centerId: null },
        ],
      },
      select: { id: true },
    });
    if (!role) throw new ForbiddenException("Director access is required.");
    return center;
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
      select: { id: true },
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
      throw new ForbiddenException("Staff access is required.");
    }
    return {
      director: false,
      classIds: assignments.map((assignment) => assignment.classId),
    };
  }

  private async requireClassAccess(
    userId: string,
    centerId: string,
    classId: string,
  ) {
    const scope = await this.requireStaffScope(userId, centerId);
    if (scope.director || scope.classIds.includes(classId)) return scope;
    throw new ForbiddenException("You cannot manage this class.");
  }

  private async requireTeacherClassAccess(
    userId: string,
    centerId: string,
    classId: string,
  ) {
    await this.requireStaffScope(userId, centerId);
    const assignment = await this.prisma.teacherClassAssignment.findFirst({
      where: {
        teacherUserId: userId,
        classId,
        endedAt: null,
        class: { centerId, status: "active" },
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new ForbiddenException(
        "Only an assigned class teacher can write special class notes.",
      );
    }
  }

  private async requireStaffForChild(userId: string, childId: string) {
    const enrollment = await this.prisma.childEnrollment.findFirst({
      where: { childId, enrollmentStatus: "active", classId: { not: null } },
      include: {
        child: { select: { firstName: true, lastName: true } },
        class: { select: { id: true, centerId: true } },
      },
    });
    if (!enrollment?.class || !enrollment.classId) {
      throw new NotFoundException("Active class enrollment not found.");
    }
    await this.requireClassAccess(userId, enrollment.class.centerId, enrollment.classId);
    return {
      centerId: enrollment.class.centerId,
      classId: enrollment.classId,
      childName: childName(enrollment.child),
    };
  }

  private async requireChildVisibility(userId: string, childId: string) {
    const guardian = await this.prisma.childGuardian.findFirst({
      where: { userId, childId },
      select: { id: true },
    });
    if (guardian) return;
    await this.requireStaffForChild(userId, childId);
  }

  private async parentChildAccess(userId: string, childId?: string) {
    const guardians = await this.prisma.childGuardian.findMany({
      where: { userId, ...(childId ? { childId } : {}) },
      include: {
        child: {
          include: {
            childEnrollments: {
              where: { enrollmentStatus: "active", classId: { not: null } },
              select: { classId: true, centerId: true },
            },
          },
        },
      },
    });
    return {
      childIds: guardians.map((guardian) => guardian.childId),
      classIds: [
        ...new Set(
          guardians.flatMap((guardian) =>
            guardian.child.childEnrollments
              .map((enrollment) => enrollment.classId)
              .filter((classId): classId is string => Boolean(classId)),
          ),
        ),
      ],
      centerIds: [
        ...new Set(
          guardians.flatMap((guardian) =>
            guardian.child.childEnrollments.map((enrollment) => enrollment.centerId),
          ),
        ),
      ],
    };
  }

  private async requireCommentAccess(
    userId: string,
    sessionId: string,
    childId: string,
  ) {
    const session = await this.findSession(sessionId);
    const guardian = await this.prisma.childGuardian.findFirst({
      where: { userId, childId },
      select: { id: true },
    });
    if (guardian) {
      if (session.status !== "published") {
        throw new ForbiddenException("Parents can only comment on published sessions.");
      }
      const enrolled = await this.prisma.childEnrollment.findFirst({
        where: {
          childId,
          classId: session.classId,
          enrollmentStatus: "active",
        },
        select: { id: true },
      });
      if (!enrolled) throw new ForbiddenException("Child is outside this class.");
      return session;
    }
    await this.requireClassAccess(userId, session.centerId, session.classId);
    return session;
  }

  private async classChildIds(classId: string) {
    const enrollments = await this.prisma.childEnrollment.findMany({
      where: { classId, enrollmentStatus: "active" },
      select: { childId: true },
    });
    return enrollments.map((enrollment) => enrollment.childId);
  }

  private async assertCenterObjects(
    centerId: string,
    input: {
      classId?: string;
      subjectId?: string;
      specialistTeacherId?: string;
      scheduleId?: string;
    },
  ) {
    if (input.classId) {
      const klass = await this.prisma.class.findFirst({
        where: { id: input.classId, centerId },
        select: { id: true },
      });
      if (!klass) throw new BadRequestException("Class is outside this center.");
    }
    if (input.subjectId) {
      const subject = await this.prisma.specialSubject.findFirst({
        where: { id: input.subjectId, centerId, status: "active" },
        select: { id: true },
      });
      if (!subject) {
        throw new BadRequestException("Subject is inactive or outside this center.");
      }
    }
    if (input.specialistTeacherId) {
      const specialist = await this.prisma.specialistTeacher.findFirst({
        where: { id: input.specialistTeacherId, centerId, status: "active" },
        select: { id: true },
      });
      if (!specialist) {
        throw new BadRequestException("Specialist is inactive or outside this center.");
      }
    }
    if (input.scheduleId) {
      const schedule = await this.prisma.specialClassSchedule.findFirst({
        where: { id: input.scheduleId, centerId },
        select: { id: true },
      });
      if (!schedule) throw new BadRequestException("Schedule is outside this center.");
    }
  }

  private async buildMonthlyProgress(childId: string, month: string) {
    const { from, to } = monthRange(month);
    const observations = await this.prisma.specialClassChildObservation.findMany({
      where: {
        childId,
        visibleToParent: true,
        session: {
          status: "published",
          sessionDate: { gte: from, lte: to },
        },
      },
      include: {
        session: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });
    const rows = new Map<string, {
      subjectId: string;
      subjectName: string;
      sessions: number;
      attended: number;
      highInterestCount: number;
      strongCount: number;
      improvingCount: number;
      needsSupportCount: number;
      strengths: string[];
      practices: string[];
    }>();
    for (const observation of observations) {
      const key = observation.session.subjectId;
      const row =
        rows.get(key) ??
        {
          subjectId: key,
          subjectName: observation.session.subject.name,
          sessions: 0,
          attended: 0,
          highInterestCount: 0,
          strongCount: 0,
          improvingCount: 0,
          needsSupportCount: 0,
          strengths: [],
          practices: [],
        };
      row.sessions += 1;
      if (observation.participation !== "absent") row.attended += 1;
      if (observation.interestLevel === "high") row.highInterestCount += 1;
      if (observation.progressLevel === "strong") row.strongCount += 1;
      if (observation.progressLevel === "improving") row.improvingCount += 1;
      if (observation.progressLevel === "needs_support") {
        row.needsSupportCount += 1;
      }
      row.strengths.push(...stringArray(observation.strongSkillKeys));
      row.practices.push(...stringArray(observation.needsPracticeSkillKeys));
      rows.set(key, row);
    }
    return [...rows.values()].map((row) => ({
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      sessions: row.sessions,
      attended: row.attended,
      highInterestCount: row.highInterestCount,
      strongCount: row.strongCount,
      improvingCount: row.improvingCount,
      needsSupportCount: row.needsSupportCount,
      topStrengths: topValues(row.strengths),
      needsPractice: topValues(row.practices),
    }));
  }

  private async notifyPublished(tx: Tx, sessionId: string) {
    const session = await tx.specialClassSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: { select: { name: true } },
        observations: {
          where: { visibleToParent: true },
          select: { childId: true },
        },
      },
    });
    if (!session) return;
    const guardians = await tx.childGuardian.findMany({
      where: { childId: { in: session.observations.map((item) => item.childId) } },
      select: { userId: true },
      distinct: ["userId"],
    });
    await Promise.all(
      guardians.map((guardian) =>
        this.notifications.enqueue(
          {
            userId: guardian.userId,
            notificationType: "special_class.session_published",
            title: "Special class update",
            body: `${session.subject.name}: ${session.title}`,
            entityType: "special_class_session",
            entityId: session.id,
            channels: ["in_app"],
          },
          tx,
        ),
      ),
    );
  }

  private async notifyComment(
    session: SessionPayload,
    childId: string,
    authorUserId: string,
  ) {
    const guardianIds = await this.prisma.childGuardian.findMany({
      where: { childId, userId: { not: authorUserId } },
      select: { userId: true },
    });
    const teacherIds = await this.prisma.teacherClassAssignment.findMany({
      where: {
        classId: session.classId,
        endedAt: null,
        teacherUserId: { not: authorUserId },
      },
      select: { teacherUserId: true },
    });
    const recipients = [
      ...guardianIds.map((item) => item.userId),
      ...teacherIds.map((item) => item.teacherUserId),
    ];
    await Promise.all(
      [...new Set(recipients)].map((userId) =>
        this.notifications.enqueue({
          userId,
          notificationType: "special_class.comment_added",
          title: "New special class comment",
          body: session.title,
          entityType: "special_class_session",
          entityId: session.id,
          channels: ["in_app"],
        }),
      ),
    );
  }
}

function toSubject(subject: {
  id: string;
  centerId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...subject,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
  };
}

function toSpecialist(specialist: {
  id: string;
  centerId: string;
  fullName: string;
  phone: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...specialist,
    createdAt: specialist.createdAt.toISOString(),
    updatedAt: specialist.updatedAt.toISOString(),
  };
}

function toRubric(rubric: {
  id: string;
  centerId: string;
  subjectId: string;
  ageGroup: string;
  skillKey: string;
  skillLabel: string;
  description: string | null;
  displayOrder: number;
  status: string;
}) {
  return rubric;
}

function toSchedule(schedule: SchedulePayload) {
  return {
    id: schedule.id,
    centerId: schedule.centerId,
    classId: schedule.classId,
    className: schedule.class.name,
    subjectId: schedule.subjectId,
    subjectName: schedule.subject.name,
    specialistTeacherId: schedule.specialistTeacherId,
    specialistTeacherName: schedule.specialistTeacher?.fullName ?? null,
    weekday: schedule.weekday,
    startTime: formatTime(schedule.startTime),
    endTime: formatTime(schedule.endTime),
    startDate: toIsoDate(schedule.startDate),
    endDate: schedule.endDate ? toIsoDate(schedule.endDate) : null,
    status: schedule.status,
    payrollType: schedule.payrollType,
    payrollAmount: schedule.payrollAmount,
  };
}

function toSessionSummary(session: SessionPayload) {
  return {
    id: session.id,
    centerId: session.centerId,
    classId: session.classId,
    className: session.class.name,
    subjectId: session.subjectId,
    subjectName: session.subject.name,
    specialistTeacherId: session.specialistTeacherId,
    specialistTeacherName: session.specialistTeacher?.fullName ?? null,
    sessionDate: toIsoDate(session.sessionDate),
    title: session.title,
    classSummary: session.classSummary,
    status: session.status,
    specialistAttendanceStatus: session.specialistAttendanceStatus,
    payrollStatus: session.payrollStatus,
    payrollAmount: session.payrollAmount,
    publishedAt: session.publishedAt?.toISOString() ?? null,
    observationCount: session.observations.length,
    mediaCount: session.media.length,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function toSessionDetail(session: SessionPayload) {
  return {
    ...toSessionSummary(session),
    observations: session.observations.map(toObservation),
    media: session.media.map(toSessionMedia),
  };
}

function toObservation(
  observation: SessionPayload["observations"][number],
) {
  return {
    id: observation.id,
    sessionId: observation.sessionId,
    childId: observation.childId,
    childName: childName(observation.child),
    participation: observation.participation,
    progressLevel: observation.progressLevel,
    interestLevel: observation.interestLevel,
    strongSkillKeys: stringArray(observation.strongSkillKeys),
    needsPracticeSkillKeys: stringArray(observation.needsPracticeSkillKeys),
    teacherNote: observation.teacherNote,
    homePractice: observation.homePractice,
    visibleToParent: observation.visibleToParent,
    updatedAt: observation.updatedAt.toISOString(),
  };
}

function toSessionMedia(media: SessionPayload["media"][number]) {
  return {
    id: media.id,
    sessionId: media.sessionId,
    mediaAssetId: media.mediaAssetId,
    visibility: media.visibility,
    childIds: media.children.map((child) => child.childId),
    mediaType: media.mediaAsset.mediaType,
    mimeType: media.mediaAsset.mimeType,
    createdAt: media.createdAt.toISOString(),
  };
}

function visibleMediaForChild(session: SessionPayload, childId: string) {
  return session.media
    .filter((media) => {
      if (media.visibility === "staff_only") return false;
      if (media.visibility === "session_children") return true;
      return media.children.some((child) => child.childId === childId);
    })
    .map(toSessionMedia);
}

function toComment(comment: {
  id: string;
  sessionId: string;
  childId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
  authorUser: { fullName: string };
}) {
  return {
    id: comment.id,
    sessionId: comment.sessionId,
    childId: comment.childId,
    authorUserId: comment.authorUserId,
    authorName: comment.authorUser.fullName,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

function toSummary(summary: {
  id: string;
  centerId: string;
  childId: string;
  month: string;
  status: string;
  structuredSummary: Prisma.JsonValue;
  aiSummaryText: string | null;
  staffEditedSummaryText: string | null;
  approvedSummaryText: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  generatedAt: Date | null;
  approvedAt: Date | null;
  child: { firstName: string; lastName: string | null };
}) {
  return {
    id: summary.id,
    centerId: summary.centerId,
    childId: summary.childId,
    childName: childName(summary.child),
    month: summary.month,
    status: summary.status,
    structuredSummary: Array.isArray(summary.structuredSummary)
      ? summary.structuredSummary
      : [],
    aiSummaryText: summary.aiSummaryText,
    staffEditedSummaryText: summary.staffEditedSummaryText,
    approvedSummaryText: summary.approvedSummaryText,
    aiProvider: summary.aiProvider,
    aiModel: summary.aiModel,
    generatedAt: summary.generatedAt?.toISOString() ?? null,
    approvedAt: summary.approvedAt?.toISOString() ?? null,
  };
}

function toPortfolioExport(exportRow: {
  id: string;
  centerId: string;
  childId: string;
  month: string | null;
  termLabel: string | null;
  mediaAssetId: string | null;
  status: string;
  generatedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: exportRow.id,
    centerId: exportRow.centerId,
    childId: exportRow.childId,
    month: exportRow.month,
    termLabel: exportRow.termLabel,
    mediaAssetId: exportRow.mediaAssetId,
    status: exportRow.status,
    generatedAt: exportRow.generatedAt?.toISOString() ?? null,
    createdAt: exportRow.createdAt.toISOString(),
  };
}

function draftSummaryText(
  child: string,
  progress: Array<{
    subjectName: string;
    highInterestCount: number;
    needsSupportCount: number;
    topStrengths: string[];
    needsPractice: string[];
  }>,
  language: string,
) {
  if (progress.length === 0) {
    return `${child} does not have enough special class observations for this month yet.`;
  }
  const strongest = [...progress].sort(
    (a, b) => b.highInterestCount - a.highInterestCount,
  )[0];
  const support = [...progress].sort(
    (a, b) => b.needsSupportCount - a.needsSupportCount,
  )[0];
  const languageNote = language === "uz" ? "Uzbek parent draft" : "Parent draft";
  return [
    `${languageNote}: ${child} showed the strongest interest in ${strongest.subjectName}.`,
    strongest.topStrengths.length
      ? `Strengths noticed: ${strongest.topStrengths.join(", ")}.`
      : "The teacher can add more skill details before sharing.",
    support.needsSupportCount > 0
      ? `${support.subjectName} needs gentle practice, especially ${support.needsPractice.join(", ") || "the skills marked by the teacher"}.`
      : "No major weak area was repeated this month.",
    "Please review and edit this draft before approving it for parents.",
  ].join(" ");
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function parseTime(value: string) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function formatTime(value: Date) {
  return value.toISOString().slice(11, 16);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1));
  const to = new Date(Date.UTC(year, monthNumber, 0));
  return { from, to };
}

function clean(value: string) {
  return value.trim();
}

function emptyToNull(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function childName(child: { firstName: string; lastName: string | null }) {
  return [child.firstName, child.lastName].filter(Boolean).join(" ");
}

function stringArray(value: Prisma.JsonValue) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function topValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value]) => value);
}
