import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { directorHomeSummarySchema } from "@kichkintoy/shared";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MembershipsService } from "../memberships/memberships.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  ApproveJoinRequestInput,
  CreateInvitationInput,
  ListJoinRequestsQuery,
  RejectJoinRequestInput,
  UpdateTeacherInput,
} from "./director.schemas";
import type { DirectorAccessLevel } from "./director.guard";

type Tx = Prisma.TransactionClient;

const INVITATION_LINK_BASE = "https://app.kichkintoy.uz/invite";
const DEFAULT_MONTHLY_TUITION_UZS = 1_000_000;
const PAID_INVOICE_STATUSES = new Set(["paid"]);
const SUCCESSFUL_PAYMENT_STATUSES = new Set(["paid", "success", "completed"]);

@Injectable()
export class DirectorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly memberships: MembershipsService,
    private readonly notifications: NotificationsService,
  ) {}

  async getHomeSummary(centerId: string) {
    const month = currentTashkentMonth();

    const [
      classes,
      activeEnrollments,
      teacherRoles,
      pendingRequests,
      missingDocuments,
    ] = await Promise.all([
      this.prisma.class.findMany({
        where: { centerId, status: "active" },
        orderBy: { name: "asc" },
        include: {
          teacherClassAssignments: {
            where: { endedAt: null },
            include: {
              teacherUser: { select: { id: true, fullName: true } },
            },
          },
        },
      }),
      this.prisma.childEnrollment.findMany({
        where: {
          centerId,
          enrollmentStatus: "active",
          child: { status: "active" },
        },
        select: {
          childId: true,
          classId: true,
        },
      }),
      this.prisma.userRole.findMany({
        where: {
          centerId,
          role: { name: "teacher" },
          user: { status: "active" },
        },
        select: { userId: true },
      }),
      this.prisma.centerJoinRequest.findMany({
        where: { centerId, status: "pending" },
        select: { kind: true },
      }),
      this.prisma.studentDocumentSubmission.count({
        where: {
          centerId,
          status: { not: "accepted" },
        },
      }),
    ]);

    const activeChildIds = [...new Set(activeEnrollments.map((item) => item.childId))];
    const invoices =
      activeChildIds.length === 0
        ? []
        : await this.prisma.invoice.findMany({
            where: {
              centerId,
              childId: { in: activeChildIds },
              OR: [
                {
                  periodStart: {
                    gte: month.periodStartDate,
                    lt: month.nextPeriodStartDate,
                  },
                },
                {
                  periodEnd: {
                    gte: month.periodStartDate,
                    lt: month.nextPeriodStartDate,
                  },
                },
                {
                  AND: [
                    { periodStart: { lte: month.periodStartDate } },
                    { periodEnd: { gte: month.periodStartDate } },
                  ],
                },
                {
                  dueDate: {
                    gte: month.periodStartDate,
                    lt: month.nextPeriodStartDate,
                  },
                },
              ],
            },
            include: { payments: true },
          });

    const paidByChild = new Map<string, number>();
    for (const invoice of invoices) {
      const successfulPayments = invoice.payments
        .filter((payment) =>
          SUCCESSFUL_PAYMENT_STATUSES.has(payment.status.toLowerCase()),
        )
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      const invoiceAmount = Number(invoice.amount);
      const invoicePaidAmount = PAID_INVOICE_STATUSES.has(
        invoice.status.toLowerCase(),
      )
        ? Math.max(invoiceAmount, successfulPayments)
        : successfulPayments;
      paidByChild.set(
        invoice.childId,
        (paidByChild.get(invoice.childId) ?? 0) + invoicePaidAmount,
      );
    }

    const monthlyTuitionAmount = DEFAULT_MONTHLY_TUITION_UZS;
    const childPaymentState = new Map<
      string,
      { paidAmount: number; unpaidAmount: number; paid: boolean }
    >();
    for (const childId of activeChildIds) {
      const paidAmount = Math.min(
        monthlyTuitionAmount,
        paidByChild.get(childId) ?? 0,
      );
      childPaymentState.set(childId, {
        paidAmount,
        unpaidAmount: Math.max(0, monthlyTuitionAmount - paidAmount),
        paid: paidAmount >= monthlyTuitionAmount,
      });
    }

    const enrollmentsByClass = new Map<string, string[]>();
    for (const enrollment of activeEnrollments) {
      if (!enrollment.classId) continue;
      const childIds = enrollmentsByClass.get(enrollment.classId) ?? [];
      if (!childIds.includes(enrollment.childId)) childIds.push(enrollment.childId);
      enrollmentsByClass.set(enrollment.classId, childIds);
    }

    const classRows = classes.map((klass) => {
      const childIds = enrollmentsByClass.get(klass.id) ?? [];
      const paidChildren = childIds.filter(
        (childId) => childPaymentState.get(childId)?.paid,
      ).length;
      const paidAmount = childIds.reduce(
        (sum, childId) => sum + (childPaymentState.get(childId)?.paidAmount ?? 0),
        0,
      );
      const expectedAmount = childIds.length * monthlyTuitionAmount;
      const maxChildren = normalizeClassCapacity(klass.maxChildren);
      const teacherNames = klass.teacherClassAssignments.map(
        (assignment) => assignment.teacherUser.fullName,
      );

      return {
        id: klass.id,
        name: klass.name,
        childCount: childIds.length,
        maxChildren,
        emptySeats:
          maxChildren === null ? null : Math.max(0, maxChildren - childIds.length),
        occupancyPercent:
          maxChildren === null
            ? null
            : Math.min(100, Math.round((childIds.length / maxChildren) * 100)),
        teacherNames,
        expectedAmount,
        paidAmount,
        unpaidAmount: Math.max(0, expectedAmount - paidAmount),
        paidChildren,
        unpaidChildren: Math.max(0, childIds.length - paidChildren),
      };
    });

    const paidChildren = activeChildIds.filter(
      (childId) => childPaymentState.get(childId)?.paid,
    ).length;
    const paidAmount = activeChildIds.reduce(
      (sum, childId) => sum + (childPaymentState.get(childId)?.paidAmount ?? 0),
      0,
    );
    const expectedAmount = activeChildIds.length * monthlyTuitionAmount;
    const pendingParentRequests = pendingRequests.filter(
      (request) => request.kind === "parent",
    ).length;
    const pendingTeacherRequests = pendingRequests.filter(
      (request) => request.kind === "teacher",
    ).length;
    const classesWithoutTeacher = classRows.filter(
      (klass) => klass.teacherNames.length === 0,
    ).length;

    return directorHomeSummarySchema.parse({
      centerId,
      currency: "UZS",
      month: {
        periodStart: dateOnly(month.periodStartDate),
        periodEnd: dateOnly(month.periodEndDate),
        label: month.label,
      },
      totals: {
        children: activeChildIds.length,
        classes: classes.length,
        teachers: new Set(teacherRoles.map((role) => role.userId)).size,
        pendingRequests: pendingRequests.length,
      },
      money: {
        monthlyTuitionAmount,
        expectedAmount,
        paidAmount,
        unpaidAmount: Math.max(0, expectedAmount - paidAmount),
        paidChildren,
        unpaidChildren: Math.max(0, activeChildIds.length - paidChildren),
      },
      classes: classRows,
      actionsNeeded: {
        pendingParentRequests,
        pendingTeacherRequests,
        classesWithoutTeacher,
        unpaidChildren: Math.max(0, activeChildIds.length - paidChildren),
        missingDocuments,
      },
    });
  }

  async listJoinRequests(
    centerId: string,
    query: ListJoinRequestsQuery,
    viewer?: { userId: string; directorView: boolean },
  ) {
    const status = query.status ?? "pending";

    // Teachers only see child-enrollment (parent) requests for the classes they
    // teach; directors see every request in the center.
    let teacherScope:
      | { kind: "parent"; requestedClassId: { in: string[] } }
      | undefined;
    if (viewer && !viewer.directorView) {
      const assignments = await this.prisma.teacherClassAssignment.findMany({
        where: {
          teacherUserId: viewer.userId,
          endedAt: null,
          class: { centerId },
        },
        select: { classId: true },
      });
      const classIds = assignments.map((assignment) => assignment.classId);
      if (classIds.length === 0) return [];
      teacherScope = { kind: "parent", requestedClassId: { in: classIds } };
    }

    const requests = await this.prisma.centerJoinRequest.findMany({
      where: { centerId, status, ...teacherScope },
      include: {
        parentUser: {
          select: { id: true, fullName: true, phone: true, username: true },
        },
        requestedClass: { select: { id: true, name: true } },
        reviewedByUser: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((request) => ({
      id: request.id,
      kind: request.kind,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      reviewerMessage: request.reviewerMessage,
      requester: {
        id: request.parentUser.id,
        fullName: request.parentUser.fullName,
        phoneNumber: request.parentUser.phone,
        username: request.parentUser.username,
      },
      child:
        request.kind === "parent"
          ? {
              name: request.childName,
              dateOfBirth:
                request.childDob?.toISOString().slice(0, 10) ?? null,
              gender: request.childGender,
              photoUrl: request.childPhotoUrl,
              relationship: request.parentRelationship,
              customRelationshipLabel: request.customRelationshipLabel,
              requestedClass: request.requestedClass,
            }
          : null,
      message: request.message,
      reviewedBy: request.reviewedByUser,
    }));
  }

  async approveJoinRequest(args: {
    centerId: string;
    requestId: string;
    reviewerUserId: string;
    accessLevel: DirectorAccessLevel;
    input: ApproveJoinRequestInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.loadActionableRequest(tx, args);

      if (request.kind === "director" && args.accessLevel !== "director") {
        throw new ForbiddenException(
          "Only a director or organization owner can approve a director-kind request.",
        );
      }

      const center = await tx.center.findUnique({
        where: { id: args.centerId },
      });

      if (!center) {
        throw new NotFoundException("Center not found.");
      }

      let resolvedClassId: string | null = request.requestedClassId;

      if (request.kind === "parent") {
        resolvedClassId =
          args.input.classId ?? request.requestedClassId ?? null;

        if (!resolvedClassId) {
          throw new BadRequestException(
            "A class must be selected before approving this parent request.",
          );
        }

        await this.applyParentApproval(tx, request, resolvedClassId);
      } else if (request.kind === "teacher") {
        await this.memberships.activateTeacher(tx, {
          userId: request.parentUserId,
          centerId: args.centerId,
        });
      } else {
        await this.memberships.activateDirector(tx, {
          userId: request.parentUserId,
          centerId: args.centerId,
        });
      }

      const updated = await tx.centerJoinRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedByUserId: args.reviewerUserId,
          requestedClassId: resolvedClassId,
        },
        include: {
          center: { select: { id: true, name: true } },
          parentUser: {
            select: { id: true, fullName: true, phone: true },
          },
        },
      });

      await this.notifications.enqueue(
        {
          userId: updated.parentUserId,
          notificationType: "join_request.approved",
          title: "Your request was approved.",
          body: `Your request to join "${updated.center.name}" was approved.`,
          entityType: "center_join_request",
          entityId: updated.id,
          channels: ["in_app", "push", "sms"],
        },
        tx,
      );

      await this.audit.log(
        {
          organizationId: center.organizationId,
          centerId: args.centerId,
          actorUserId: args.reviewerUserId,
          action: "join_request.approved",
          entityType: "center_join_request",
          entityId: updated.id,
          metadata: {
            kind: updated.kind,
            requester_user_id: updated.parentUserId,
            center_id: args.centerId,
          },
        },
        tx,
      );

      const smsRecipient = updated.parentUser.phone;
      if (smsRecipient) {
        this.notifications
          .deliverSms(smsRecipient, buildApprovedSms(updated.center.name))
          .catch(() => undefined);
      }

      return {
        id: updated.id,
        status: updated.status,
        kind: updated.kind,
        reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      };
    });
  }

  async rejectJoinRequest(args: {
    centerId: string;
    requestId: string;
    reviewerUserId: string;
    accessLevel: DirectorAccessLevel;
    input: RejectJoinRequestInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.loadActionableRequest(tx, args);

      if (request.kind === "director" && args.accessLevel !== "director") {
        throw new ForbiddenException(
          "Only a director or organization owner can reject a director-kind request.",
        );
      }

      const center = await tx.center.findUnique({
        where: { id: args.centerId },
      });

      const updated = await tx.centerJoinRequest.update({
        where: { id: request.id },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedByUserId: args.reviewerUserId,
          reviewerMessage: args.input.reason?.trim() || null,
        },
        include: {
          center: { select: { id: true, name: true } },
          parentUser: {
            select: { id: true, fullName: true, phone: true },
          },
        },
      });

      await this.notifications.enqueue(
        {
          userId: updated.parentUserId,
          notificationType: "join_request.rejected",
          title: "Your request was not approved.",
          body:
            args.input.reason?.trim() ||
            `The director of "${updated.center.name}" did not approve your request.`,
          entityType: "center_join_request",
          entityId: updated.id,
          channels: ["in_app", "push", "sms"],
        },
        tx,
      );

      await this.audit.log(
        {
          organizationId: center?.organizationId ?? null,
          centerId: args.centerId,
          actorUserId: args.reviewerUserId,
          action: "join_request.rejected",
          entityType: "center_join_request",
          entityId: updated.id,
          metadata: {
            kind: updated.kind,
            requester_user_id: updated.parentUserId,
            center_id: args.centerId,
            reason: args.input.reason ?? null,
          },
        },
        tx,
      );

      const smsRecipient = updated.parentUser.phone;
      if (smsRecipient) {
        this.notifications
          .deliverSms(smsRecipient, buildRejectedSms(updated.center.name))
          .catch(() => undefined);
      }

      return {
        id: updated.id,
        status: updated.status,
        kind: updated.kind,
        reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      };
    });
  }

  async listInvitations(centerId: string) {
    const invitations = await this.prisma.centerInvitation.findMany({
      where: { centerId },
      orderBy: { createdAt: "desc" },
      include: {
        invitedByUser: { select: { id: true, fullName: true } },
        acceptedByUser: { select: { id: true, fullName: true } },
        class: { select: { id: true, name: true } },
      },
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      kind: invitation.kind,
      phone: invitation.phone,
      childNameHint: invitation.childNameHint,
      class: invitation.class,
      expiresAt: invitation.expiresAt.toISOString(),
      sentAt: invitation.sentAt?.toISOString() ?? null,
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      declinedAt: invitation.declinedAt?.toISOString() ?? null,
      revokedAt: invitation.revokedAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
      invitedBy: invitation.invitedByUser,
      acceptedBy: invitation.acceptedByUser,
      status: deriveInvitationStatus(invitation),
    }));
  }

  async createInvitation(args: {
    centerId: string;
    createdByUserId: string;
    input: CreateInvitationInput;
  }) {
    const center = await this.prisma.center.findUnique({
      where: { id: args.centerId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!center) {
      throw new NotFoundException("Center not found.");
    }

    if (args.input.classId) {
      const klass = await this.prisma.class.findUnique({
        where: { id: args.input.classId },
        select: { id: true, centerId: true, status: true },
      });

      if (!klass || klass.centerId !== center.id) {
        throw new BadRequestException(
          "Selected class does not belong to this center.",
        );
      }
    }

    const phone = normalizePhoneNumber(args.input.phone);
    const code = await this.generateUniqueInvitationCode();
    const expiresAt = new Date(
      Date.now() + args.input.expiresInDays * 24 * 60 * 60 * 1000,
    );

    const invitation = await this.prisma.centerInvitation.create({
      data: {
        centerId: center.id,
        invitedByUserId: args.createdByUserId,
        kind: args.input.kind,
        classId: args.input.classId ?? null,
        phone,
        childNameHint: args.input.childNameHint?.trim() || null,
        code,
        expiresAt,
      },
    });

    const message = buildInvitationSms(center.name, code);
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
      actorUserId: args.createdByUserId,
      action: "invitation.created",
      entityType: "center_invitation",
      entityId: invitation.id,
      metadata: { kind: args.input.kind, phone },
    });

    return {
      id: invitation.id,
      kind: invitation.kind,
      phone: invitation.phone,
      classId: invitation.classId,
      expiresAt: invitation.expiresAt.toISOString(),
      sentAt: delivery.sent ? new Date().toISOString() : null,
      smsProvider: delivery.provider,
      smsDelivered: delivery.sent,
    };
  }

  async resendInvitation(args: {
    centerId: string;
    invitationId: string;
    actorUserId: string;
  }) {
    const invitation = await this.prisma.centerInvitation.findUnique({
      where: { id: args.invitationId },
      include: { center: { select: { name: true } } },
    });

    if (!invitation || invitation.centerId !== args.centerId) {
      throw new NotFoundException("Invitation not found.");
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException("This invitation was already accepted.");
    }

    if (invitation.revokedAt) {
      throw new BadRequestException("This invitation has been revoked.");
    }

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const message = buildInvitationSms(invitation.center.name, invitation.code);
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
      centerId: args.centerId,
      actorUserId: args.actorUserId,
      action: "invitation.resent",
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

  async revokeInvitation(args: {
    centerId: string;
    invitationId: string;
    actorUserId: string;
  }) {
    const invitation = await this.prisma.centerInvitation.findUnique({
      where: { id: args.invitationId },
    });

    if (!invitation || invitation.centerId !== args.centerId) {
      throw new NotFoundException("Invitation not found.");
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException("Accepted invitations cannot be revoked.");
    }

    if (invitation.revokedAt) {
      return { id: invitation.id, revokedAt: invitation.revokedAt };
    }

    const updated = await this.prisma.centerInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({
      centerId: args.centerId,
      actorUserId: args.actorUserId,
      action: "invitation.revoked",
      entityType: "center_invitation",
      entityId: invitation.id,
    });

    return {
      id: updated.id,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
    };
  }

  async updateTeacher(args: {
    centerId: string;
    teacherUserId: string;
    actorUserId: string;
    input: UpdateTeacherInput;
  }) {
    const teacherRole = await this.prisma.userRole.findFirst({
      where: {
        userId: args.teacherUserId,
        centerId: args.centerId,
        role: { name: "teacher" },
      },
    });

    if (!teacherRole) {
      throw new NotFoundException("Teacher not found at this center.");
    }

    const updated = await this.prisma.userRole.update({
      where: { id: teacherRole.id },
      data: { canApproveMembers: args.input.canApproveMembers },
    });

    await this.audit.log({
      centerId: args.centerId,
      actorUserId: args.actorUserId,
      action: "teacher.permissions_updated",
      entityType: "user_role",
      entityId: updated.id,
      metadata: { canApproveMembers: args.input.canApproveMembers },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      canApproveMembers: updated.canApproveMembers,
    };
  }

  private async loadActionableRequest(
    tx: Tx,
    args: { centerId: string; requestId: string },
  ) {
    const request = await tx.centerJoinRequest.findUnique({
      where: { id: args.requestId },
    });

    if (!request || request.centerId !== args.centerId) {
      throw new NotFoundException("Join request not found.");
    }

    if (request.status !== "pending") {
      throw new BadRequestException(
        "Only pending requests can be approved or rejected.",
      );
    }

    return request;
  }

  private async applyParentApproval(
    tx: Tx,
    request: Awaited<
      ReturnType<Prisma.TransactionClient["centerJoinRequest"]["findUnique"]>
    >,
    classId: string,
  ) {
    if (!request) {
      throw new NotFoundException("Join request not found.");
    }

    if (!request.childName || !request.childDob) {
      throw new BadRequestException(
        "Parent request is missing required child information.",
      );
    }

    const { center, child } = await this.memberships.activateParent(tx, {
      userId: request.parentUserId,
      centerId: request.centerId,
      classId,
      child: {
        name: request.childName,
        dateOfBirth: request.childDob,
        gender:
          (request.childGender ?? "prefer_not_to_say") as
            | "boy"
            | "girl"
            | "prefer_not_to_say",
        imageUrl: request.childPhotoUrl ?? undefined,
        relationshipType: request.parentRelationship ?? "guardian",
        customRelationshipLabel: request.customRelationshipLabel ?? undefined,
      },
    });

    if (request.childId !== child.id) {
      await tx.centerJoinRequest.update({
        where: { id: request.id },
        data: { childId: child.id },
      });
    }

    return { center, child };
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

function buildApprovedSms(centerName: string) {
  return `Kichkintoy: your request to join ${centerName} was approved. Open the app to see your child.`;
}

function currentTashkentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const periodStartDate = new Date(Date.UTC(year, month - 1, 1));
  const nextPeriodStartDate = new Date(Date.UTC(year, month, 1));
  const periodEndDate = new Date(nextPeriodStartDate);
  periodEndDate.setUTCDate(periodEndDate.getUTCDate() - 1);

  return {
    periodStartDate,
    nextPeriodStartDate,
    periodEndDate,
    label: `${year}-${String(month).padStart(2, "0")}`,
  };
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeClassCapacity(value: number | null) {
  if (
    value === 5 ||
    value === 10 ||
    value === 15 ||
    value === 20 ||
    value === 25 ||
    value === 30 ||
    value === 35
  ) {
    return value;
  }
  return null;
}

function buildRejectedSms(centerName: string) {
  return `Kichkintoy: your request to join ${centerName} was not approved. You can choose a different center in the app.`;
}

function buildInvitationSms(centerName: string, code: string) {
  return `Kichkintoy: ${centerName} invited you. Open the app to accept. ${INVITATION_LINK_BASE}/${code}`;
}

function deriveInvitationStatus(invitation: {
  acceptedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}) {
  if (invitation.acceptedAt) return "accepted";
  if (invitation.revokedAt) return "revoked";
  if (invitation.declinedAt) return "declined";
  if (invitation.expiresAt.getTime() <= Date.now()) return "expired";
  return "pending";
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

function normalizePhoneNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  return `${prefix}${trimmed.replace(/\D/g, "")}`;
}
