import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

@Injectable()
export class DirectorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly memberships: MembershipsService,
    private readonly notifications: NotificationsService,
  ) {}

  async listJoinRequests(centerId: string, query: ListJoinRequestsQuery) {
    const status = query.status ?? "pending";

    const requests = await this.prisma.centerJoinRequest.findMany({
      where: { centerId, status },
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
