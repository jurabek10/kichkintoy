import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MembershipsService } from "../memberships/memberships.service";
import { NotificationsService } from "../notifications/notifications.service";
import { EskizSmsService } from "./eskiz-sms.service";
import type {
  ChildRegistrationInput,
  DirectorSetupInput,
  LoginInput,
  RegisterInput,
  SendCodeInput,
  SubmitJoinRequestInput,
  UserRoleInput,
  VerifyCodeInput,
} from "./auth.schemas";

const scrypt = promisify(scryptCallback);
const otpTtlMs = 5 * 60 * 1000;
const otpResendCooldownMs = 30 * 1000;
const otpMaxSendsPerHour = 5;
const otpMaxAttempts = 5;
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;

const ROLE_PARENT = "parent" as const;
const ROLE_TEACHER = "teacher" as const;
const ROLE_DIRECTOR = "director" as const;
const ROLE_ORGANIZATION_OWNER = "organization_owner" as const;
const APPROVER_ROLE_NAMES = [ROLE_DIRECTOR, ROLE_ORGANIZATION_OWNER];

type Tx = Prisma.TransactionClient;
export type RequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};
type MembershipPayload = {
  status: "active" | "pending";
  joinRequestId: string | null;
  centerId: string | null;
  centerName: string | null;
  // Omitted ⇒ false (the membership schema defaults it). Set true for directors
  // and approver-teachers so the client can show actionable controls.
  canApproveMembers?: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eskizSms: EskizSmsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly memberships: MembershipsService,
  ) {}

  async sendCode(input: SendCodeInput, _ctx: RequestContext = {}) {
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    await this.enforceOtpSendLimits(phoneNumber);

    const code = createOtpCode();
    const delivery = await this.eskizSms.sendVerificationCode(
      phoneNumber,
      code,
    );

    await this.prisma.phoneVerification.create({
      data: {
        phone: phoneNumber,
        codeHash: hashOpaqueValue(code),
        expiresAt: new Date(Date.now() + otpTtlMs),
      },
    });

    return {
      phoneNumber,
      expiresInSeconds: Math.floor(otpTtlMs / 1000),
      delivery: delivery.provider,
      sent: delivery.sent,
      debugCode: shouldReturnDebugCode() ? code : undefined,
    };
  }

  async verifyCode(input: VerifyCodeInput, _ctx: RequestContext = {}) {
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        phone: phoneNumber,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      throw new BadRequestException(
        "Verification code is incorrect or expired.",
      );
    }

    // Lock the code after too many wrong guesses; the user must request a new one.
    if (verification.attempts >= otpMaxAttempts) {
      throw new HttpException(
        "Too many incorrect attempts. Please request a new code.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!safeEqualHex(verification.codeHash, hashOpaqueValue(input.code))) {
      await this.prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException(
        "Verification code is incorrect or expired.",
      );
    }

    const verificationToken = randomToken();

    await this.prisma.phoneVerification.update({
      where: { id: verification.id },
      data: {
        verifiedAt: new Date(),
        verificationToken,
      },
    });

    return {
      phoneNumber,
      verificationToken,
    };
  }

  private async enforceOtpSendLimits(phone: string) {
    const now = Date.now();
    const recent = await this.prisma.phoneVerification.findMany({
      where: { phone, createdAt: { gt: new Date(now - 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (recent.length >= otpMaxSendsPerHour) {
      throw new HttpException(
        "Too many verification codes requested. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (recent[0] && now - recent[0].createdAt.getTime() < otpResendCooldownMs) {
      throw new HttpException(
        "Please wait a moment before requesting another code.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async lookupInvitationsByVerification(verificationToken: string) {
    const verification = await this.prisma.phoneVerification.findUnique({
      where: { verificationToken },
    });

    if (
      !verification ||
      !verification.verifiedAt ||
      verification.expiresAt <= new Date()
    ) {
      throw new BadRequestException("Phone verification is required.");
    }

    return this.listInvitationsForPhone(verification.phone);
  }

  async listMyInvitations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      return [];
    }

    return this.listInvitationsForPhone(user.phone);
  }

  async acceptInvitationDuringRegister(
    tx: Tx,
    args: {
      userId: string;
      invitationId: string;
      verifiedPhone: string;
      child?: ChildRegistrationInput;
      role: UserRoleInput;
    },
  ): Promise<MembershipPayload> {
    const invitation = await this.requireOpenInvitation(tx, {
      invitationId: args.invitationId,
      verifiedPhone: args.verifiedPhone,
    });

    if (
      (args.role === "parent" && invitation.kind !== "parent") ||
      (args.role === "teacher" && invitation.kind !== "teacher")
    ) {
      throw new BadRequestException(
        "Invitation role does not match the chosen signup role.",
      );
    }

    const result = await this.materializeAcceptedInvitation(tx, {
      invitation,
      acceptingUserId: args.userId,
      child: args.child,
    });

    await this.notifyInvitationAccepted(tx, invitation);

    return result;
  }

  async acceptInvitation(
    userId: string,
    invitationId: string,
    child?: ChildRegistrationInput,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.phone) {
      throw new BadRequestException(
        "Your phone number is not verified. Please re-verify your phone.",
      );
    }

    const userPhone = user.phone;

    return this.prisma.$transaction(async (tx) => {
      const invitation = await this.requireOpenInvitation(tx, {
        invitationId,
        verifiedPhone: userPhone,
      });

      const membership = await this.materializeAcceptedInvitation(tx, {
        invitation,
        acceptingUserId: userId,
        child,
      });

      await this.notifyInvitationAccepted(tx, invitation);

      return { membership };
    });
  }

  async declineInvitation(userId: string, invitationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      throw new BadRequestException("Phone number is not verified.");
    }

    const userPhone = user.phone;

    return this.prisma.$transaction(async (tx) => {
      const invitation = await this.requireOpenInvitation(tx, {
        invitationId,
        verifiedPhone: userPhone,
      });

      await tx.centerInvitation.update({
        where: { id: invitation.id },
        data: { declinedAt: new Date() },
      });

      await this.notifications.enqueue(
        {
          userId: invitation.invitedByUserId,
          notificationType: "invitation.declined",
          title: "Invitation declined",
          body: "The invited person declined your invitation.",
          entityType: "center_invitation",
          entityId: invitation.id,
          channels: ["in_app"],
        },
        tx,
      );

      return { success: true };
    });
  }

  async register(input: RegisterInput, ctx: RequestContext = {}) {
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    const normalizedUsername = input.username.trim().toLowerCase();
    const verification = await this.prisma.phoneVerification.findUnique({
      where: { verificationToken: input.phoneVerificationToken },
    });

    if (
      !verification ||
      verification.phone !== phoneNumber ||
      !verification.verifiedAt ||
      verification.consumedAt ||
      verification.expiresAt <= new Date()
    ) {
      throw new BadRequestException("Phone verification is required.");
    }

    await this.ensureUniqueAccount(normalizedUsername, phoneNumber);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: normalizedUsername,
            phone: phoneNumber,
            fullName: input.fullName.trim(),
            userNotificationSettings: { create: {} },
          },
        });

        await tx.authCredential.create({
          data: {
            userId: user.id,
            passwordHash: await hashPassword(input.password),
          },
        });

        let membership: MembershipPayload;

        if (input.invitationId) {
          if (input.role !== "parent" && input.role !== "teacher") {
            throw new BadRequestException(
              "Invitations are only valid for parent or teacher signup.",
            );
          }

          if (input.role === "parent") {
            await tx.parentProfile.create({
              data: { userId: user.id, displayName: input.fullName.trim() },
            });
          } else {
            await tx.teacherProfile.create({
              data: { userId: user.id },
            });
          }

          membership = await this.acceptInvitationDuringRegister(tx, {
            userId: user.id,
            invitationId: input.invitationId,
            verifiedPhone: phoneNumber,
            child: input.child,
            role: input.role,
          });
        } else if (input.role === ROLE_PARENT) {
          await tx.parentProfile.create({
            data: { userId: user.id, displayName: input.fullName.trim() },
          });

          membership = await this.handleParentSelfSearch(tx, {
            userId: user.id,
            centerId: input.centerSelection!.centerId,
            classId: input.centerSelection!.classId,
            child: input.child!,
          });
        } else if (input.role === ROLE_TEACHER) {
          await tx.teacherProfile.create({
            data: { userId: user.id },
          });

          membership = await this.handleTeacherSelfSearch(tx, {
            userId: user.id,
            centerId: input.centerSelection!.centerId,
          });
        } else {
          membership = await this.handleDirectorSetup(tx, {
            userId: user.id,
            setup: input.directorSetup!,
          });
        }

        await tx.phoneVerification.update({
          where: { id: verification.id },
          data: { consumedAt: new Date() },
        });

        const session = await createSession(tx, user.id);

        return {
          user: toAuthUser(user, input.role),
          session,
          membership,
        };
      });

      await this.audit.log({
        actorUserId: result.user.id,
        action: "auth.register",
        entityType: "user",
        entityId: result.user.id,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        metadata: { role: input.role },
      });

      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "That username or phone number is already in use.",
        );
      }
      throw error;
    }
  }

  async submitJoinRequest(userId: string, input: SubmitJoinRequestInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const primaryRole = getPrimaryRole(user.userRoles);

    return this.prisma.$transaction(async (tx) => {
      if (primaryRole === ROLE_PARENT) {
        if (!input.centerSelection) {
          throw new BadRequestException(
            "Center selection is required for parents.",
          );
        }

        const child =
          input.child ?? (await this.deriveChildFromHistory(tx, userId));

        if (!child) {
          throw new BadRequestException(
            "Child information is required. Provide a child payload or submit it during signup.",
          );
        }

        const membership = await this.handleParentSelfSearch(tx, {
          userId,
          centerId: input.centerSelection.centerId,
          classId: input.centerSelection.classId,
          child,
        });

        return { membership };
      }

      if (primaryRole === ROLE_TEACHER) {
        if (!input.centerSelection) {
          throw new BadRequestException(
            "Center selection is required for teachers.",
          );
        }

        const membership = await this.handleTeacherSelfSearch(tx, {
          userId,
          centerId: input.centerSelection.centerId,
        });

        return { membership };
      }

      if (!input.directorSetup) {
        throw new BadRequestException(
          "Director setup is required when re-submitting as a director.",
        );
      }

      const membership = await this.handleDirectorSetup(tx, {
        userId,
        setup: input.directorSetup,
      });

      return { membership };
    });
  }

  async cancelJoinRequest(userId: string, requestId: string) {
    const request = await this.prisma.centerJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.parentUserId !== userId) {
      throw new NotFoundException("Join request not found.");
    }

    if (request.status !== "pending") {
      throw new BadRequestException("Only pending requests can be cancelled.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.centerJoinRequest.update({
        where: { id: request.id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });

      await this.notifyCenterApprovers(tx, request.centerId, {
        notificationType: "join_request.cancelled",
        title: "A join request was cancelled.",
        body: "The requester withdrew their join request.",
        entityType: "center_join_request",
        entityId: request.id,
        channels: ["in_app"],
        kind: request.kind === "director" ? "director" : "regular",
      });

      await this.audit.log(
        {
          centerId: request.centerId,
          actorUserId: userId,
          action: "join_request.cancelled",
          entityType: "center_join_request",
          entityId: request.id,
        },
        tx,
      );
    });

    return { success: true };
  }

  async login(input: LoginInput, ctx: RequestContext = {}) {
    const normalizedUsername = input.username.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { username: normalizedUsername },
      include: {
        authCredential: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user?.authCredential) {
      await this.auditLoginFailure(normalizedUsername, ctx);
      throw new UnauthorizedException("Username or password is incorrect.");
    }

    const isValidPassword = await verifyPassword(
      input.password,
      user.authCredential.passwordHash,
    );

    if (!isValidPassword) {
      await this.auditLoginFailure(normalizedUsername, ctx);
      throw new UnauthorizedException("Username or password is incorrect.");
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const createdSession = await createSession(tx, user.id);
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      return createdSession;
    });

    await this.audit.log({
      actorUserId: user.id,
      action: "auth.login.succeeded",
      entityType: "user",
      entityId: user.id,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    });

    const membership = await this.resolveMembership(user.id);

    return {
      user: toAuthUser(user, getPrimaryRole(user.userRoles)),
      session,
      membership,
    };
  }

  /**
   * Change the signed-in user's password after re-verifying the current one.
   * Used by the account/"My Page" screen. The active session is intentionally
   * left valid — we are not forcing a re-login on the device making the change.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ctx: RequestContext = {},
  ) {
    const credential = await this.prisma.authCredential.findUnique({
      where: { userId },
    });

    if (!credential) {
      throw new BadRequestException("No password is set for this account.");
    }

    const isValid = await verifyPassword(
      currentPassword,
      credential.passwordHash,
    );

    if (!isValid) {
      throw new BadRequestException("Current password is incorrect.");
    }

    await this.prisma.authCredential.update({
      where: { userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    await this.audit.log({
      actorUserId: userId,
      action: "auth.password_changed",
      entityType: "user",
      entityId: userId,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    });

    return { success: true };
  }

  /**
   * Change the signed-in user's phone number. Requires a verification token
   * issued by `verifyCode` for the exact new number (same OTP flow as signup),
   * and rejects a number already claimed by another account.
   */
  async changePhone(
    userId: string,
    phoneNumberInput: string,
    phoneVerificationToken: string,
    ctx: RequestContext = {},
  ) {
    const phoneNumber = normalizePhoneNumber(phoneNumberInput);

    const verification = await this.prisma.phoneVerification.findUnique({
      where: { verificationToken: phoneVerificationToken },
    });

    if (
      !verification ||
      verification.phone !== phoneNumber ||
      !verification.verifiedAt ||
      verification.consumedAt ||
      verification.expiresAt <= new Date()
    ) {
      throw new BadRequestException("Phone verification is required.");
    }

    const conflict = await this.prisma.user.findFirst({
      where: { phone: phoneNumber, id: { not: userId } },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException(
        "That phone number is already in use by another account.",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { phone: phoneNumber },
      });
      await tx.phoneVerification.update({
        where: { id: verification.id },
        data: { consumedAt: new Date() },
      });
    });

    await this.audit.log({
      actorUserId: userId,
      action: "auth.phone_changed",
      entityType: "user",
      entityId: userId,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    });

    return { phone: phoneNumber };
  }

  async logout(token: string, ctx: RequestContext = {}) {
    const tokenHash = hashOpaqueValue(token);
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });

    await this.prisma.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (session) {
      await this.audit.log({
        actorUserId: session.userId,
        action: "auth.logout",
        entityType: "user",
        entityId: session.userId,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return { success: true };
  }

  private async auditLoginFailure(username: string, ctx: RequestContext) {
    await this.audit.log({
      action: "auth.login.failed",
      entityType: "user",
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: { username },
    });
  }

  private async ensureUniqueAccount(username: string, phoneNumber: string) {
    // Neutral message: do not reveal which of username/phone already exists
    // (prevents account enumeration).
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { phone: phoneNumber }] },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        "That username or phone number is already in use.",
      );
    }
  }

  private async handleParentSelfSearch(
    tx: Tx,
    args: {
      userId: string;
      centerId: string;
      classId?: string;
      child: ChildRegistrationInput;
    },
  ): Promise<MembershipPayload> {
    const center = await this.requireSelectableCenter(tx, args.centerId);

    if (args.classId) {
      const klass = await tx.class.findUnique({
        where: { id: args.classId },
      });
      if (!klass || klass.centerId !== center.id) {
        throw new BadRequestException(
          "Selected class does not belong to this center.",
        );
      }
    }

    await this.cancelExistingPendingRequests(tx, args.userId);
    await this.ensureNoDuplicatePendingRequest(tx, args.userId, args.centerId);

    const relationship =
      args.child.relationshipType === "other"
        ? args.child.customRelationshipLabel?.trim() || "other"
        : args.child.relationshipType;

    const request = await tx.centerJoinRequest.create({
      data: {
        parentUserId: args.userId,
        centerId: center.id,
        requestedClassId: args.classId ?? null,
        kind: "parent",
        childName: args.child.name.trim(),
        childDob: args.child.dateOfBirth,
        childGender: args.child.gender,
        childPhotoUrl: args.child.imageUrl ?? null,
        parentRelationship: relationship,
        customRelationshipLabel:
          args.child.customRelationshipLabel?.trim() || null,
        status: "pending",
      },
    });

    await this.notifyCenterApprovers(tx, center.id, {
      notificationType: "join_request.submitted",
      title: "New parent request",
      body: `A parent submitted a join request for ${args.child.name.trim()}.`,
      entityType: "center_join_request",
      entityId: request.id,
      channels: ["in_app", "push"],
      kind: "regular",
    });

    await this.audit.log(
      {
        organizationId: center.organizationId,
        centerId: center.id,
        actorUserId: args.userId,
        action: "join_request.submitted",
        entityType: "center_join_request",
        entityId: request.id,
        metadata: { kind: "parent" },
      },
      tx,
    );

    return {
      status: "pending",
      joinRequestId: request.id,
      centerId: center.id,
      centerName: center.name,
    };
  }

  private async handleTeacherSelfSearch(
    tx: Tx,
    args: { userId: string; centerId: string },
  ): Promise<MembershipPayload> {
    const center = await this.requireSelectableCenter(tx, args.centerId);
    await this.cancelExistingPendingRequests(tx, args.userId);
    await this.ensureNoDuplicatePendingRequest(tx, args.userId, center.id);

    const request = await tx.centerJoinRequest.create({
      data: {
        parentUserId: args.userId,
        centerId: center.id,
        kind: "teacher",
        status: "pending",
      },
    });

    await this.notifyCenterApprovers(tx, center.id, {
      notificationType: "join_request.submitted",
      title: "New teacher request",
      body: "A teacher submitted a join request for your center.",
      entityType: "center_join_request",
      entityId: request.id,
      channels: ["in_app", "push"],
      kind: "regular",
    });

    await this.audit.log(
      {
        organizationId: center.organizationId,
        centerId: center.id,
        actorUserId: args.userId,
        action: "join_request.submitted",
        entityType: "center_join_request",
        entityId: request.id,
        metadata: { kind: "teacher" },
      },
      tx,
    );

    return {
      status: "pending",
      joinRequestId: request.id,
      centerId: center.id,
      centerName: center.name,
    };
  }

  private async handleDirectorSetup(
    tx: Tx,
    args: { userId: string; setup: DirectorSetupInput },
  ): Promise<MembershipPayload> {
    if (args.setup.mode === "create_new") {
      const create = args.setup.createNew!;

      const region = await tx.region.findUnique({
        where: { id: create.regionId },
      });
      if (!region) {
        throw new BadRequestException("Region is invalid.");
      }

      const district = await tx.district.findUnique({
        where: { id: create.districtId },
      });
      if (!district || district.regionId !== region.id) {
        throw new BadRequestException(
          "District does not belong to the selected region.",
        );
      }

      const organization = await tx.organization.create({
        data: {
          name: create.organizationName.trim(),
          defaultLanguage: create.defaultLanguage,
        },
      });

      const centerCode = await generateUniqueCenterCode(tx);
      const center = await tx.center.create({
        data: {
          organizationId: organization.id,
          name: create.centerName.trim(),
          centerCode,
          facilityType: create.facilityType,
          phone: create.centerPhone?.trim() || null,
          address: create.address?.trim() || null,
          regionId: region.id,
          districtId: district.id,
          region: region.name,
          district: district.name,
          status: "active",
        },
      });

      await this.memberships.ensureRole(tx, {
        userId: args.userId,
        roleName: ROLE_ORGANIZATION_OWNER,
        organizationId: organization.id,
        centerId: null,
      });

      await this.memberships.ensureRole(tx, {
        userId: args.userId,
        roleName: ROLE_DIRECTOR,
        organizationId: organization.id,
        centerId: center.id,
      });

      await this.audit.log(
        {
          organizationId: organization.id,
          centerId: center.id,
          actorUserId: args.userId,
          action: "center.created",
          entityType: "center",
          entityId: center.id,
        },
        tx,
      );

      return {
        status: "active",
        joinRequestId: null,
        centerId: center.id,
        centerName: center.name,
      };
    }

    const claim = args.setup.claimExisting!;
    const center = await tx.center.findUnique({ where: { id: claim.centerId } });

    if (!center) {
      throw new BadRequestException("Center not found.");
    }

    if (center.status !== "active") {
      throw new BadRequestException(
        "This center is not accepting new directors yet.",
      );
    }

    await this.cancelExistingPendingRequests(tx, args.userId);

    if (!(await this.centerHasAssignedDirector(tx, center))) {
      const hasOrgOwner = await tx.userRole.findFirst({
        where: {
          organizationId: center.organizationId,
          centerId: null,
          role: { name: ROLE_ORGANIZATION_OWNER },
        },
      });

      if (!hasOrgOwner) {
        await this.memberships.ensureRole(tx, {
          userId: args.userId,
          roleName: ROLE_ORGANIZATION_OWNER,
          organizationId: center.organizationId,
          centerId: null,
        });
      }

      await this.memberships.activateDirector(tx, {
        userId: args.userId,
        centerId: center.id,
      });

      await this.audit.log(
        {
          organizationId: center.organizationId,
          centerId: center.id,
          actorUserId: args.userId,
          action: "director.claimed_unassigned_center",
          entityType: "center",
          entityId: center.id,
        },
        tx,
      );

      return {
        status: "active",
        joinRequestId: null,
        centerId: center.id,
        centerName: center.name,
      };
    }

    const request = await tx.centerJoinRequest.create({
      data: {
        parentUserId: args.userId,
        centerId: center.id,
        kind: "director",
        status: "pending",
      },
    });

    await this.notifyCenterApprovers(tx, center.id, {
      notificationType: "join_request.submitted",
      title: "Director claim request",
      body: "A director submitted a request to be added to your center.",
      entityType: "center_join_request",
      entityId: request.id,
      channels: ["in_app", "push"],
      kind: "director",
      excludeUserId: args.userId,
    });

    await this.audit.log(
      {
        organizationId: center.organizationId,
        centerId: center.id,
        actorUserId: args.userId,
        action: "join_request.submitted",
        entityType: "center_join_request",
        entityId: request.id,
        metadata: { kind: "director" },
      },
      tx,
    );

    return {
      status: "pending",
      joinRequestId: request.id,
      centerId: center.id,
      centerName: center.name,
    };
  }

  private async centerHasAssignedDirector(
    tx: Tx,
    center: { id: string; organizationId: string },
  ) {
    const approver = await tx.userRole.findFirst({
      where: {
        OR: [
          {
            centerId: center.id,
            role: { name: { in: APPROVER_ROLE_NAMES } },
          },
          {
            organizationId: center.organizationId,
            centerId: null,
            role: { name: ROLE_ORGANIZATION_OWNER },
          },
        ],
      },
      select: { id: true },
    });

    return approver !== null;
  }

  private async requireSelectableCenter(tx: Tx, centerId: string) {
    const center = await tx.center.findUnique({ where: { id: centerId } });

    if (!center) {
      throw new NotFoundException("Center not found.");
    }

    if (center.status !== "active") {
      throw new BadRequestException(
        "This center is not accepting new requests yet.",
      );
    }

    return center;
  }

  private async cancelExistingPendingRequests(tx: Tx, userId: string) {
    await tx.centerJoinRequest.updateMany({
      where: { parentUserId: userId, status: "pending" },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
  }

  private async ensureNoDuplicatePendingRequest(
    tx: Tx,
    userId: string,
    centerId: string,
  ) {
    const existing = await tx.centerJoinRequest.findFirst({
      where: { parentUserId: userId, centerId, status: "pending" },
    });

    if (existing) {
      throw new ConflictException(
        "You already have a pending request at this center.",
      );
    }
  }

  private async deriveChildFromHistory(tx: Tx, userId: string) {
    const lastRequest = await tx.centerJoinRequest.findFirst({
      where: { parentUserId: userId, kind: "parent" },
      orderBy: { createdAt: "desc" },
    });

    if (!lastRequest?.childName || !lastRequest.childDob) {
      return null;
    }

    return {
      name: lastRequest.childName,
      dateOfBirth: lastRequest.childDob,
      gender: (lastRequest.childGender ?? "prefer_not_to_say") as
        | "boy"
        | "girl"
        | "prefer_not_to_say",
      imageUrl: lastRequest.childPhotoUrl ?? undefined,
      relationshipType: (lastRequest.parentRelationship ?? "guardian") as
        | "mom"
        | "dad"
        | "grandmother"
        | "grandfather"
        | "uncle"
        | "aunt"
        | "brother"
        | "sister"
        | "guardian"
        | "other",
      customRelationshipLabel: lastRequest.customRelationshipLabel ?? undefined,
    } satisfies ChildRegistrationInput;
  }

  private async listInvitationsForPhone(phone: string) {
    const invitations = await this.prisma.centerInvitation.findMany({
      where: {
        phone,
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        center: {
          select: { id: true, name: true, centerCode: true, facilityType: true },
        },
        class: { select: { id: true, name: true } },
        invitedByUser: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      kind: invitation.kind,
      childNameHint: invitation.childNameHint,
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      center: invitation.center,
      class: invitation.class,
      invitedBy: invitation.invitedByUser,
    }));
  }

  private async requireOpenInvitation(
    tx: Tx,
    args: { invitationId: string; verifiedPhone: string },
  ) {
    const invitation = await tx.centerInvitation.findUnique({
      where: { id: args.invitationId },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    if (invitation.phone !== args.verifiedPhone) {
      throw new BadRequestException(
        "This invitation does not match your verified phone number.",
      );
    }

    if (invitation.revokedAt) {
      throw new BadRequestException("This invitation has been revoked.");
    }

    if (invitation.declinedAt) {
      throw new BadRequestException("This invitation was already declined.");
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException("This invitation was already used.");
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("This invitation has expired.");
    }

    return invitation;
  }

  private async materializeAcceptedInvitation(
    tx: Tx,
    args: {
      invitation: Prisma.CenterInvitationGetPayload<{}>;
      acceptingUserId: string;
      child?: ChildRegistrationInput;
    },
  ): Promise<MembershipPayload> {
    const { invitation } = args;

    if (invitation.kind === "parent") {
      if (!args.child) {
        throw new BadRequestException(
          "Child information is required to accept a parent invitation.",
        );
      }

      const { center } = await this.memberships.activateParent(tx, {
        userId: args.acceptingUserId,
        centerId: invitation.centerId,
        classId: invitation.classId ?? undefined,
        child: {
          name: args.child.name,
          dateOfBirth: args.child.dateOfBirth,
          gender: args.child.gender,
          imageUrl: args.child.imageUrl,
          relationshipType: args.child.relationshipType,
          customRelationshipLabel: args.child.customRelationshipLabel,
        },
      });

      await this.markInvitationAccepted(tx, invitation.id, args.acceptingUserId);

      return {
        status: "active",
        joinRequestId: null,
        centerId: center.id,
        centerName: center.name,
      };
    }

    const { center } = await this.memberships.activateTeacher(tx, {
      userId: args.acceptingUserId,
      centerId: invitation.centerId,
      classId: invitation.classId ?? undefined,
    });

    await this.markInvitationAccepted(tx, invitation.id, args.acceptingUserId);

    return {
      status: "active",
      joinRequestId: null,
      centerId: center.id,
      centerName: center.name,
    };
  }

  private async markInvitationAccepted(
    tx: Tx,
    invitationId: string,
    acceptingUserId: string,
  ) {
    await tx.centerInvitation.update({
      where: { id: invitationId },
      data: {
        acceptedAt: new Date(),
        acceptedByUserId: acceptingUserId,
      },
    });
  }

  private async notifyInvitationAccepted(
    tx: Tx,
    invitation: Prisma.CenterInvitationGetPayload<{}>,
  ) {
    await this.notifications.enqueue(
      {
        userId: invitation.invitedByUserId,
        notificationType: "invitation.accepted",
        title: "Invitation accepted",
        body: "Your invitation was accepted and an active membership was created.",
        entityType: "center_invitation",
        entityId: invitation.id,
        channels: ["in_app", "push"],
      },
      tx,
    );
  }

  private async notifyCenterApprovers(
    tx: Tx,
    centerId: string,
    args: {
      notificationType: string;
      title: string;
      body?: string;
      entityType: string;
      entityId: string;
      channels: Array<"in_app" | "push" | "sms">;
      excludeUserId?: string;
      kind: "regular" | "director";
    },
  ) {
    const orClauses: Prisma.UserRoleWhereInput[] = [
      { role: { name: { in: APPROVER_ROLE_NAMES } } },
    ];

    if (args.kind === "regular") {
      orClauses.push({
        role: { name: "teacher" },
        canApproveMembers: true,
      });
    }

    const rows = await tx.userRole.findMany({
      where: { centerId, OR: orClauses },
      select: { userId: true },
    });

    const recipientIds = Array.from(
      new Set(
        rows.map((r) => r.userId).filter((id) => id !== args.excludeUserId),
      ),
    );

    await Promise.all(
      recipientIds.map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: args.notificationType,
            title: args.title,
            body: args.body,
            entityType: args.entityType,
            entityId: args.entityId,
            channels: args.channels,
          },
          tx,
        ),
      ),
    );
  }

  private async resolveMembership(
    userId: string,
  ): Promise<MembershipPayload> {
    const centerRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        centerId: { not: null },
      },
      include: { center: true, role: true },
      orderBy: { createdAt: "desc" },
    });

    if (centerRole?.center) {
      // Directors/org owners always can; teachers only when granted the flag.
      const isDirector =
        centerRole.role?.name === "director" ||
        centerRole.role?.name === "organization_owner";
      return {
        status: "active",
        joinRequestId: null,
        centerId: centerRole.centerId,
        centerName: centerRole.center.name,
        canApproveMembers: isDirector || centerRole.canApproveMembers,
      };
    }

    const orgRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        organizationId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    if (orgRole?.organizationId) {
      const orgCenter = await this.prisma.center.findFirst({
        where: {
          organizationId: orgRole.organizationId,
          status: "active",
        },
        orderBy: { createdAt: "asc" },
      });

      return {
        status: "active",
        joinRequestId: null,
        centerId: orgCenter?.id ?? null,
        centerName: orgCenter?.name ?? null,
        canApproveMembers: true,
      };
    }

    const pending = await this.prisma.centerJoinRequest.findFirst({
      where: { parentUserId: userId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { center: true },
    });

    if (pending) {
      return {
        status: "pending",
        joinRequestId: pending.id,
        centerId: pending.centerId,
        centerName: pending.center.name,
      };
    }

    return {
      status: "pending",
      joinRequestId: null,
      centerId: null,
      centerName: null,
    };
  }
}

function normalizePhoneNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  return `${prefix}${trimmed.replace(/\D/g, "")}`;
}

// Demo/bypass codes are opt-in and can NEVER activate in production. They only
// apply when NODE_ENV is non-production AND the explicit flag is set — failing
// closed if the environment is misconfigured.
function allowDemoCode() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_ALLOW_DEMO_CODE === "true"
  );
}

function createOtpCode() {
  if (allowDemoCode() && process.env.AUTH_DEMO_CODE) {
    return process.env.AUTH_DEMO_CODE;
  }

  return String(randomInt(100000, 999999));
}

function shouldReturnDebugCode() {
  return allowDemoCode();
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function hashOpaqueValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

// Constant-time comparison of two hex-encoded digests to avoid timing leaks.
function safeEqualHex(a: string, b: string) {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  if (bufferA.length === 0 || bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("base64url")}`;
}

async function verifyPassword(password: string, storedPassword: string) {
  const [algorithm, salt, storedHash] = storedPassword.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const hash = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(storedHash, "base64url");

  if (hash.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(hash, stored);
}

async function createSession(tx: Prisma.TransactionClient, userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + sessionTtlMs);

  await tx.authSession.create({
    data: {
      userId,
      tokenHash: hashOpaqueValue(token),
      expiresAt,
    },
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

function toAuthUser(
  user: {
    id: string;
    username: string | null;
    phone: string | null;
    fullName: string;
  },
  role: UserRoleInput,
) {
  return {
    id: user.id,
    username: user.username,
    phoneNumber: user.phone,
    fullName: user.fullName,
    role,
  };
}

function getPrimaryRole(
  userRoles: Array<{ role: { name: string } }>,
): UserRoleInput {
  for (const userRole of userRoles) {
    const role = userRole.role.name;
    if (role === "director" || role === "parent" || role === "teacher") {
      return role;
    }
  }
  return "parent";
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

const CENTER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRawCenterCode() {
  let raw = "";
  for (let i = 0; i < 4; i += 1) {
    raw += CENTER_CODE_ALPHABET[randomInt(0, CENTER_CODE_ALPHABET.length)];
  }
  return `KIC-${raw}`;
}

async function generateUniqueCenterCode(
  tx: Prisma.TransactionClient,
  attempt = 0,
): Promise<string> {
  if (attempt > 8) {
    throw new Error("Failed to generate a unique center code.");
  }

  const candidate = generateRawCenterCode();
  const existing = await tx.center.findUnique({
    where: { centerCode: candidate },
    select: { id: true },
  });

  if (existing) {
    return generateUniqueCenterCode(tx, attempt + 1);
  }

  return candidate;
}
