import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  studentDocumentAnswersSchema,
  studentDocumentFieldsSchema,
  studentDocumentRequestListSchema,
  studentDocumentRequestStatusSchema,
  studentDocumentRequestSummarySchema,
  studentDocumentSafetySummarySchema,
  studentDocumentSubmissionDetailSchema,
  studentDocumentSubmissionListSchema,
  studentDocumentSubmissionStatusSchema,
  studentDocumentTemplateListSchema,
  studentDocumentTemplateStatusSchema,
  studentDocumentTemplateSummarySchema,
  studentDocumentTemplateTypeSchema,
  type CreateStudentDocumentTemplateInput,
  type ParentSaveStudentDocumentDraftInput,
  type ParentSubmitStudentDocumentInput,
  type ReviewStudentDocumentSubmissionInput,
  type SendStudentDocumentRequestInput,
  type StudentDocumentAnswers,
  type StudentDocumentField,
  type StudentDocumentSubmissionDetail,
  type UpdateStudentDocumentTemplateInput,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const templateInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
} satisfies Prisma.StudentDocumentTemplateInclude;

const requestInclude = {
  template: true,
  classes: { include: { class: { select: { id: true, name: true } } } },
  children: {
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  submissions: {
    select: { id: true, status: true },
  },
} satisfies Prisma.StudentDocumentRequestInclude;

const submissionInclude = {
  request: {
    include: {
      template: true,
    },
  },
  child: {
    include: {
      childEnrollments: {
        where: { enrollmentStatus: "active" },
        include: {
          class: { select: { id: true, name: true } },
        },
        take: 1,
      },
    },
  },
  submittedByUser: { select: { id: true, fullName: true } },
  reviewedByUser: { select: { id: true, fullName: true } },
  attachments: {
    include: {
      mediaAsset: {
        select: { id: true, mediaType: true, mimeType: true, createdAt: true },
      },
    },
    orderBy: { position: "asc" },
  },
} satisfies Prisma.StudentDocumentSubmissionInclude;

type TemplatePayload = Prisma.StudentDocumentTemplateGetPayload<{
  include: typeof templateInclude;
}>;
type RequestPayload = Prisma.StudentDocumentRequestGetPayload<{
  include: typeof requestInclude;
}>;
type SubmissionPayload = Prisma.StudentDocumentSubmissionGetPayload<{
  include: typeof submissionInclude;
}>;

@Injectable()
export class StudentDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async staffTemplates(
    userId: string,
    input: { centerId: string; status?: string },
  ) {
    await this.requireDirector(userId, input.centerId);
    const templates = await this.prisma.studentDocumentTemplate.findMany({
      where: {
        centerId: input.centerId,
        ...(input.status ? { status: input.status } : {}),
      },
      include: templateInclude,
      orderBy: { updatedAt: "desc" },
    });
    return studentDocumentTemplateListSchema.parse(
      templates.map((template) => this.toTemplateSummary(template)),
    );
  }

  async createTemplate(userId: string, input: CreateStudentDocumentTemplateInput) {
    const center = await this.requireDirector(userId, input.centerId);
    const template = await this.prisma.studentDocumentTemplate.create({
      data: {
        centerId: input.centerId,
        createdByUserId: userId,
        title: clean(input.title),
        description: emptyToNull(input.description),
        templateType: input.templateType,
        status: input.status ?? "draft",
        fields: input.fields as Prisma.InputJsonValue,
      },
      include: templateInclude,
    });
    await this.audit.log({
      organizationId: center.organizationId,
      centerId: input.centerId,
      actorUserId: userId,
      action: "student_document.template_created",
      entityType: "student_document_template",
      entityId: template.id,
      metadata: { template_type: input.templateType },
    });
    return studentDocumentTemplateSummarySchema.parse(
      this.toTemplateSummary(template),
    );
  }

  async updateTemplate(userId: string, input: UpdateStudentDocumentTemplateInput) {
    const existing = await this.findTemplate(input.templateId);
    const center = await this.requireDirector(userId, existing.centerId);
    const template = await this.prisma.studentDocumentTemplate.update({
      where: { id: existing.id },
      data: {
        ...(input.body.title !== undefined
          ? { title: clean(input.body.title) }
          : {}),
        ...(input.body.description !== undefined
          ? { description: emptyToNull(input.body.description) }
          : {}),
        ...(input.body.templateType !== undefined
          ? { templateType: input.body.templateType }
          : {}),
        ...(input.body.status !== undefined ? { status: input.body.status } : {}),
        ...(input.body.fields !== undefined
          ? { fields: input.body.fields as Prisma.InputJsonValue }
          : {}),
        ...(input.body.status === "archived" ? { archivedAt: new Date() } : {}),
      },
      include: templateInclude,
    });
    await this.audit.log({
      organizationId: center.organizationId,
      centerId: existing.centerId,
      actorUserId: userId,
      action: "student_document.template_updated",
      entityType: "student_document_template",
      entityId: template.id,
    });
    return studentDocumentTemplateSummarySchema.parse(
      this.toTemplateSummary(template),
    );
  }

  async archiveTemplate(userId: string, templateId: string) {
    return this.updateTemplate(userId, {
      templateId,
      body: { status: "archived" },
    });
  }

  async staffRequests(
    userId: string,
    input: { centerId: string; status?: string },
  ) {
    await this.requireStaff(userId, input.centerId);
    const requests = await this.prisma.studentDocumentRequest.findMany({
      where: {
        centerId: input.centerId,
        ...(input.status ? { status: input.status } : {}),
      },
      include: requestInclude,
      orderBy: { createdAt: "desc" },
    });
    return studentDocumentRequestListSchema.parse(
      requests.map((request) => this.toRequestSummary(request)),
    );
  }

  async requestDetail(userId: string, requestId: string) {
    const request = await this.findRequest(requestId);
    await this.requireStaff(userId, request.centerId);
    return studentDocumentRequestSummarySchema.parse(
      this.toRequestSummary(request),
    );
  }

  async sendRequest(userId: string, input: SendStudentDocumentRequestInput) {
    const center = await this.requireDirector(userId, input.centerId);
    const template = await this.findTemplate(input.templateId);
    if (template.centerId !== input.centerId || template.status !== "active") {
      throw new BadRequestException("Choose an active template for this center.");
    }
    const audience = await this.resolveAudience(input);
    if (audience.childIds.length === 0) {
      throw new BadRequestException("No active children match this request.");
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.studentDocumentRequest.create({
        data: {
          centerId: input.centerId,
          templateId: template.id,
          createdByUserId: userId,
          targetType: input.targetType,
          title: clean(input.title),
          instructions: emptyToNull(input.instructions),
          dueDate: input.dueDate ? parseDate(input.dueDate) : null,
          status: "sent",
          sentAt: new Date(),
          classes:
            audience.classIds.length > 0
              ? { create: audience.classIds.map((classId) => ({ classId })) }
              : undefined,
          children:
            input.targetType === "child"
              ? { create: audience.childIds.map((childId) => ({ childId })) }
              : undefined,
          submissions: {
            create: audience.childIds.map((childId) => ({
              centerId: input.centerId,
              childId,
              status: "not_started",
            })),
          },
        },
        include: requestInclude,
      });
      await this.audit.log(
        {
          organizationId: center.organizationId,
          centerId: input.centerId,
          actorUserId: userId,
          action: "student_document.request_sent",
          entityType: "student_document_request",
          entityId: created.id,
          metadata: { target_type: input.targetType },
        },
        tx,
      );
      await this.notifyParents(tx, audience.childIds, {
        notificationType: "student_document.request_sent",
        title: "New document request",
        body: created.title,
        entityId: created.id,
      });
      return created;
    });

    return studentDocumentRequestSummarySchema.parse(
      this.toRequestSummary(request),
    );
  }

  async closeRequest(userId: string, requestId: string) {
    const existing = await this.findRequest(requestId);
    const center = await this.requireDirector(userId, existing.centerId);
    const request = await this.prisma.studentDocumentRequest.update({
      where: { id: requestId },
      data: { status: "closed", closedAt: new Date() },
      include: requestInclude,
    });
    await this.audit.log({
      organizationId: center.organizationId,
      centerId: existing.centerId,
      actorUserId: userId,
      action: "student_document.request_closed",
      entityType: "student_document_request",
      entityId: requestId,
    });
    return studentDocumentRequestSummarySchema.parse(
      this.toRequestSummary(request),
    );
  }

  async staffSubmissions(
    userId: string,
    input: {
      centerId: string;
      requestId?: string;
      classId?: string;
      status?: string;
    },
  ) {
    const scope = await this.requireStaff(userId, input.centerId);
    const submissions = await this.prisma.studentDocumentSubmission.findMany({
      where: {
        centerId: input.centerId,
        ...(input.requestId ? { requestId: input.requestId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.classId
          ? {
              child: {
                childEnrollments: {
                  some: {
                    classId: input.classId,
                    enrollmentStatus: "active",
                  },
                },
              },
            }
          : {}),
        ...(scope.director
          ? {}
          : {
              child: {
                childEnrollments: {
                  some: {
                    classId: { in: scope.classIds },
                    enrollmentStatus: "active",
                  },
                },
              },
            }),
      },
      include: submissionInclude,
      orderBy: { updatedAt: "desc" },
    });
    return studentDocumentSubmissionListSchema.parse(
      submissions.map((submission) => this.toSubmissionSummary(submission)),
    );
  }

  async submissionDetail(userId: string, submissionId: string) {
    const submission = await this.findSubmission(submissionId);
    await this.requireCanViewSubmission(userId, submission);
    return studentDocumentSubmissionDetailSchema.parse(
      this.toSubmissionDetail(submission),
    );
  }

  async parentRequests(
    userId: string,
    input: { childId?: string; status?: string } = {},
  ) {
    const access = await this.parentAccess(userId, input.childId);
    const submissions = await this.prisma.studentDocumentSubmission.findMany({
      where: {
        childId: { in: access.childIds },
        ...(input.status ? { status: input.status } : {}),
        request: { status: { in: ["sent", "closed"] } },
      },
      include: submissionInclude,
      orderBy: { updatedAt: "desc" },
    });
    return studentDocumentSubmissionListSchema.parse(
      submissions.map((submission) => this.toSubmissionSummary(submission)),
    );
  }

  async parentSaveDraft(
    userId: string,
    input: ParentSaveStudentDocumentDraftInput,
  ) {
    return this.saveParentSubmission(userId, input, false);
  }

  async parentSubmit(userId: string, input: ParentSubmitStudentDocumentInput) {
    return this.saveParentSubmission(userId, input, true);
  }

  async reviewSubmission(
    userId: string,
    input: ReviewStudentDocumentSubmissionInput,
  ) {
    const existing = await this.findSubmission(input.submissionId);
    const center = await this.requireDirector(userId, existing.centerId);
    if (
      input.decision === "needs_correction" &&
      !input.correctionNote?.trim()
    ) {
      throw new BadRequestException("Correction note is required.");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.studentDocumentSubmission.update({
        where: { id: existing.id },
        data: {
          status: input.decision,
          correctionNote:
            input.decision === "needs_correction"
              ? clean(input.correctionNote ?? "")
              : null,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
        },
        include: submissionInclude,
      });
      await this.audit.log(
        {
          organizationId: center.organizationId,
          centerId: existing.centerId,
          actorUserId: userId,
          action:
            input.decision === "accepted"
              ? "student_document.submission_accepted"
              : "student_document.submission_correction_requested",
          entityType: "student_document_submission",
          entityId: existing.id,
          metadata: { status: input.decision },
        },
        tx,
      );
      await this.notifyParents(tx, [existing.childId], {
        notificationType: `student_document.${input.decision}`,
        title:
          input.decision === "accepted"
            ? "Document accepted"
            : "Document needs correction",
        body: existing.request.title,
        entityId: existing.id,
      });
      return submission;
    });
    return studentDocumentSubmissionDetailSchema.parse(
      this.toSubmissionDetail(updated),
    );
  }

  async childSafetySummary(userId: string, childId: string) {
    const enrollment = await this.prisma.childEnrollment.findFirst({
      where: { childId, enrollmentStatus: "active" },
      include: {
        child: true,
        class: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });
    if (!enrollment) throw new NotFoundException("Child not found.");
    const scope = await this.requireStaff(userId, enrollment.centerId).catch(
      () => null,
    );
    if (
      !scope ||
      (!scope.director &&
        (!enrollment.classId || !scope.classIds.includes(enrollment.classId)))
    ) {
      await this.parentAccess(userId, childId);
    }
    const latestMedical = await this.prisma.studentDocumentSubmission.findFirst({
      where: {
        childId,
        status: "accepted",
        request: { template: { templateType: "medical_allergy" } },
      },
      orderBy: { reviewedAt: "desc" },
    });
    const latestEmergency = await this.prisma.studentDocumentSubmission.findFirst({
      where: {
        childId,
        status: "accepted",
        request: { template: { templateType: "emergency_contact" } },
      },
      orderBy: { reviewedAt: "desc" },
    });
    const medicalAnswers = answerRecord(latestMedical?.answers);
    const emergencyAnswers = answerRecord(latestEmergency?.answers);
    return studentDocumentSafetySummarySchema.parse({
      childId,
      childName: childName(enrollment.child),
      classId: enrollment.classId,
      className: enrollment.class?.name ?? null,
      allergies:
        textAnswer(medicalAnswers, ["allergies", "allergy", "food_restrictions"]) ??
        enrollment.child.allergies ??
        null,
      medicalNotes:
        textAnswer(medicalAnswers, ["medical_notes", "chronic_conditions"]) ??
        enrollment.child.medicalNotes ??
        null,
      emergencyContacts: [
        textAnswer(emergencyAnswers, ["primary_contact", "emergency_contact"]),
        textAnswer(emergencyAnswers, ["secondary_contact"]),
      ].filter((item): item is string => Boolean(item)),
      lastUpdatedAt:
        latestMedical?.reviewedAt?.toISOString() ??
        latestEmergency?.reviewedAt?.toISOString() ??
        null,
    });
  }

  private async saveParentSubmission(
    userId: string,
    input: ParentSaveStudentDocumentDraftInput,
    submit: boolean,
  ) {
    const existing = await this.findSubmission(input.submissionId);
    await this.parentAccess(userId, existing.childId);
    if (!["not_started", "in_progress", "needs_correction"].includes(existing.status)) {
      throw new BadRequestException("This submission cannot be edited.");
    }
    if (existing.request.status !== "sent") {
      throw new BadRequestException("This document request is not open.");
    }
    const fields = parseFields(existing.request.template.fields);
    validateAnswers(fields, input.answers, submit);
    const mediaByField = mediaByFieldKey(fields, input.answers, input.attachmentMediaAssetIds);
    await this.requireParentMedia(userId, existing.centerId, mediaByField);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.studentDocumentAttachment.deleteMany({
        where: { submissionId: existing.id },
      });
      for (const [fieldKey, mediaAssetIds] of Object.entries(mediaByField)) {
        await tx.studentDocumentAttachment.createMany({
          data: mediaAssetIds.map((mediaAssetId, position) => ({
            submissionId: existing.id,
            mediaAssetId,
            fieldKey,
            position,
          })),
          skipDuplicates: true,
        });
      }
      const submission = await tx.studentDocumentSubmission.update({
        where: { id: existing.id },
        data: {
          answers: input.answers as Prisma.InputJsonValue,
          submittedByUserId: userId,
          status: submit ? "submitted" : "in_progress",
          correctionNote: submit ? null : existing.correctionNote,
          submittedAt: submit ? new Date() : existing.submittedAt,
        },
        include: submissionInclude,
      });
      await this.audit.log(
        {
          centerId: existing.centerId,
          actorUserId: userId,
          action: submit
            ? "student_document.submission_submitted"
            : "student_document.submission_draft_saved",
          entityType: "student_document_submission",
          entityId: existing.id,
        },
        tx,
      );
      if (submit) {
        await this.notifyDirectors(tx, existing.centerId, {
          notificationType: "student_document.submitted",
          title: "Document submitted",
          body: existing.request.title,
          entityId: existing.id,
        });
      }
      return submission;
    });
    return studentDocumentSubmissionDetailSchema.parse(
      this.toSubmissionDetail(updated),
    );
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
    if (!role) {
      throw new ForbiddenException("Only directors can manage documents.");
    }
    return center;
  }

  private async requireStaff(userId: string, centerId: string) {
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
      throw new ForbiddenException("You cannot access center documents.");
    }
    return {
      director: false,
      classIds: assignments.map((assignment) => assignment.classId),
    };
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
      guardian.child.childEnrollments.map((enrollment) => ({
        childId: guardian.childId,
        centerId: enrollment.centerId,
        classId: enrollment.classId,
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
      centerIds: unique(enrollments.map((item) => item.centerId)),
      classIds: unique(
        enrollments.flatMap((item) => (item.classId ? [item.classId] : [])),
      ),
    };
  }

  private async requireCanViewSubmission(
    userId: string,
    submission: SubmissionPayload,
  ) {
    const parent = await this.parentAccess(userId, submission.childId).catch(
      () => null,
    );
    if (parent) return;
    const scope = await this.requireStaff(userId, submission.centerId);
    if (scope.director) return;
    throw new ForbiddenException("Only directors can access full submissions.");
  }

  private async resolveAudience(input: SendStudentDocumentRequestInput) {
    if (input.targetType === "center") {
      const enrollments = await this.prisma.childEnrollment.findMany({
        where: { centerId: input.centerId, enrollmentStatus: "active" },
        select: { childId: true, classId: true },
      });
      return {
        childIds: unique(enrollments.map((item) => item.childId)),
        classIds: unique(
          enrollments.flatMap((item) => (item.classId ? [item.classId] : [])),
        ),
      };
    }
    if (input.targetType === "class") {
      const classIds = unique(input.classIds ?? []);
      const classes = await this.prisma.class.findMany({
        where: { id: { in: classIds }, centerId: input.centerId, status: "active" },
        select: { id: true },
      });
      if (classes.length !== classIds.length) {
        throw new ForbiddenException("One or more classes are not available.");
      }
      const enrollments = await this.prisma.childEnrollment.findMany({
        where: {
          centerId: input.centerId,
          classId: { in: classIds },
          enrollmentStatus: "active",
        },
        select: { childId: true },
      });
      return {
        childIds: unique(enrollments.map((item) => item.childId)),
        classIds,
      };
    }
    const childIds = unique(input.childIds ?? []);
    const enrollments = await this.prisma.childEnrollment.findMany({
      where: {
        centerId: input.centerId,
        childId: { in: childIds },
        enrollmentStatus: "active",
      },
      select: { childId: true, classId: true },
    });
    if (enrollments.length !== childIds.length) {
      throw new ForbiddenException("One or more children are not available.");
    }
    return {
      childIds,
      classIds: unique(
        enrollments.flatMap((item) => (item.classId ? [item.classId] : [])),
      ),
    };
  }

  private async requireParentMedia(
    userId: string,
    centerId: string,
    mediaByField: Record<string, string[]>,
  ) {
    const mediaAssetIds = unique(Object.values(mediaByField).flat());
    if (mediaAssetIds.length === 0) return;
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: mediaAssetIds },
        centerId,
        uploaderUserId: userId,
        fileUrl: { not: "pending" },
      },
      select: { id: true, mimeType: true, sizeBytes: true },
    });
    if (assets.length !== mediaAssetIds.length) {
      throw new ForbiddenException("One or more attachments are not available.");
    }
    for (const asset of assets) {
      if (
        asset.mimeType &&
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(asset.mimeType)
      ) {
        throw new BadRequestException("Documents must be images, PDFs, or Word files.");
      }
      if (asset.sizeBytes && Number(asset.sizeBytes) > 10 * 1024 * 1024) {
        throw new BadRequestException("Document file is too large.");
      }
    }
  }

  private async notifyParents(
    tx: Tx,
    childIds: string[],
    input: {
      notificationType: string;
      title: string;
      body?: string | null;
      entityId: string;
    },
  ) {
    const guardians = await tx.childGuardian.findMany({
      where: { childId: { in: childIds } },
      select: { userId: true },
    });
    await Promise.all(
      unique(guardians.map((guardian) => guardian.userId)).map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: input.notificationType,
            title: input.title,
            body: input.body,
            entityType: "student_document",
            entityId: input.entityId,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private async notifyDirectors(
    tx: Tx,
    centerId: string,
    input: {
      notificationType: string;
      title: string;
      body?: string | null;
      entityId: string;
    },
  ) {
    const center = await tx.center.findUnique({
      where: { id: centerId },
      select: { organizationId: true },
    });
    if (!center) return;
    const roles = await tx.userRole.findMany({
      where: {
        role: { name: { in: ["director", "organization_owner"] } },
        OR: [
          { centerId },
          { organizationId: center.organizationId, centerId: null },
        ],
      },
      select: { userId: true },
    });
    await Promise.all(
      unique(roles.map((role) => role.userId)).map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: input.notificationType,
            title: input.title,
            body: input.body,
            entityType: "student_document",
            entityId: input.entityId,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private async findTemplate(templateId: string) {
    const template = await this.prisma.studentDocumentTemplate.findUnique({
      where: { id: templateId },
      include: templateInclude,
    });
    if (!template) throw new NotFoundException("Document template not found.");
    return template;
  }

  private async findRequest(requestId: string) {
    const request = await this.prisma.studentDocumentRequest.findUnique({
      where: { id: requestId },
      include: requestInclude,
    });
    if (!request) throw new NotFoundException("Document request not found.");
    return request;
  }

  private async findSubmission(submissionId: string) {
    const submission = await this.prisma.studentDocumentSubmission.findUnique({
      where: { id: submissionId },
      include: submissionInclude,
    });
    if (!submission) {
      throw new NotFoundException("Document submission not found.");
    }
    return submission;
  }

  private toTemplateSummary(template: TemplatePayload) {
    return {
      id: template.id,
      centerId: template.centerId,
      title: template.title,
      description: template.description,
      templateType: template.templateType,
      status: studentDocumentTemplateStatusSchema.parse(template.status),
      fields: parseFields(template.fields),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      archivedAt: template.archivedAt?.toISOString() ?? null,
    };
  }

  private toRequestSummary(request: RequestPayload) {
    const submitted = request.submissions.filter((item) =>
      ["submitted", "needs_correction", "accepted"].includes(item.status),
    );
    return {
      id: request.id,
      centerId: request.centerId,
      templateId: request.templateId,
      title: request.title,
      instructions: request.instructions,
      targetType: request.targetType,
      classIds: request.classes.map((item) => item.classId),
      classNames: request.classes.map((item) => item.class.name),
      childIds: request.children.map((item) => item.childId),
      childNames: request.children.map((item) => childName(item.child)),
      dueDate: request.dueDate?.toISOString().slice(0, 10) ?? null,
      status: studentDocumentRequestStatusSchema.parse(request.status),
      sentAt: request.sentAt?.toISOString() ?? null,
      closedAt: request.closedAt?.toISOString() ?? null,
      totalSubmissions: request.submissions.length,
      submittedCount: submitted.length,
      acceptedCount: request.submissions.filter((item) => item.status === "accepted")
        .length,
      needsCorrectionCount: request.submissions.filter(
        (item) => item.status === "needs_correction",
      ).length,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private toSubmissionSummary(submission: SubmissionPayload) {
    const enrollment = submission.child.childEnrollments[0];
    return {
      id: submission.id,
      requestId: submission.requestId,
      centerId: submission.centerId,
      childId: submission.childId,
      childName: childName(submission.child),
      classId: enrollment?.classId ?? null,
      className: enrollment?.class?.name ?? null,
      requestTitle: submission.request.title,
      templateType: studentDocumentTemplateTypeSchema.parse(
        submission.request.template.templateType,
      ),
      dueDate: submission.request.dueDate?.toISOString().slice(0, 10) ?? null,
      status: studentDocumentSubmissionStatusSchema.parse(submission.status),
      correctionNote: submission.correctionNote,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      attachmentCount: submission.attachments.length,
      updatedAt: submission.updatedAt.toISOString(),
    };
  }

  private toSubmissionDetail(
    submission: SubmissionPayload,
  ): StudentDocumentSubmissionDetail {
    return {
      ...this.toSubmissionSummary(submission),
      templateId: submission.request.templateId,
      instructions: submission.request.instructions,
      fields: parseFields(submission.request.template.fields),
      answers: answerRecord(submission.answers),
      attachments: submission.attachments.map((attachment) => ({
        id: attachment.id,
        submissionId: attachment.submissionId,
        mediaAssetId: attachment.mediaAssetId,
        fieldKey: attachment.fieldKey,
        originalFilename: attachment.originalFilename,
        position: attachment.position,
        mediaType: attachment.mediaAsset.mediaType,
        mimeType: attachment.mediaAsset.mimeType,
        createdAt: attachment.createdAt.toISOString(),
      })),
      submittedByName: submission.submittedByUser?.fullName ?? null,
      reviewedByName: submission.reviewedByUser?.fullName ?? null,
    };
  }
}

function parseFields(value: Prisma.JsonValue) {
  return studentDocumentFieldsSchema.parse(value);
}

function answerRecord(value: Prisma.JsonValue | undefined): StudentDocumentAnswers {
  return studentDocumentAnswersSchema.parse(value ?? {});
}

function validateAnswers(
  fields: StudentDocumentField[],
  answers: StudentDocumentAnswers,
  submit: boolean,
) {
  const fieldKeys = new Set(fields.map((field) => field.key));
  for (const key of Object.keys(answers)) {
    if (!fieldKeys.has(key)) {
      throw new BadRequestException(`Unknown field: ${key}`);
    }
  }
  if (!submit) return;
  for (const field of fields) {
    if (!field.required) continue;
    const value = answers[field.key];
    if (field.type === "file") {
      if (!Array.isArray(value) || value.length === 0) {
        throw new BadRequestException(`${field.label} is required.`);
      }
      continue;
    }
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      value === false
    ) {
      throw new BadRequestException(`${field.label} is required.`);
    }
  }
}

function mediaByFieldKey(
  fields: StudentDocumentField[],
  answers: StudentDocumentAnswers,
  fallbackMediaAssetIds?: string[],
) {
  // File fields and drawn signatures both store media-asset ids; a typed-name
  // signature stays a plain string and is skipped here. Signatures cap at one.
  const mediaFields = fields.filter(
    (field) => field.type === "file" || field.type === "signature",
  );
  const result: Record<string, string[]> = {};
  for (const field of mediaFields) {
    const value = answers[field.key];
    if (Array.isArray(value)) {
      result[field.key] = value.filter(isUuidLike);
      const cap = field.type === "signature" ? 1 : field.maxFiles;
      if (cap && result[field.key].length > cap) {
        throw new BadRequestException(`${field.label} has too many files.`);
      }
    }
  }
  if (fallbackMediaAssetIds?.length) {
    const fileFields = fields.filter((field) => field.type === "file");
    const fieldKey = fileFields[0]?.key ?? "attachments";
    result[fieldKey] = unique([...(result[fieldKey] ?? []), ...fallbackMediaAssetIds]);
  }
  return result;
}

function textAnswer(answers: StudentDocumentAnswers, keys: string[]) {
  for (const key of keys) {
    const value = answers[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isUuidLike(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Invalid date.");
  }
  return date;
}

function unique(values: string[]) {
  return [...new Set(values)];
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
