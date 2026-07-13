import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomInt } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";

const INVITE_TTL = 72 * 60 * 60 * 1000;
const allowedRelationships = new Set(["father", "mother", "grandfather", "grandmother", "other"]);

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listGuardians(userId: string) {
    const links = await this.prisma.childGuardian.findMany({
      where: { userId }, select: { isPrimary: true, child: { select: { id: true, firstName: true, lastName: true,
        childGuardians: { select: { relationship: true, isPrimary: true, user: { select: {
          id: true, fullName: true, avatarUrl: true, telegramUsername: true,
        } } } },
      } } }, orderBy: { createdAt: "asc" },
    });
    const canManage = links.some((link) => link.isPrimary);
    const invitations = canManage ? await this.prisma.familyInvitation.findMany({
      where: { invitedByUserId: userId, acceptedAt: null, revokedAt: null }, orderBy: { createdAt: "desc" },
    }) : [];
    const now = new Date();
    return { canManage, children: links.map(({ child }) => ({ id: child.id, fullName: [child.firstName, child.lastName].filter(Boolean).join(" "),
      guardians: child.childGuardians.map((g) => ({ userId: g.user.id, fullName: g.user.fullName,
        avatarUrl: g.user.avatarUrl, telegramUsername: g.user.telegramUsername,
        relationship: g.relationship, isPrimary: g.isPrimary })),
    })), pendingInvitations: invitations.map((i) => ({ id: i.id, relationship: i.relationship as "father" | "mother" | "grandfather" | "grandmother" | "other",
      code: i.code, expiresAt: i.expiresAt.toISOString(), status: i.expiresAt <= now ? "expired" as const : "pending" as const })) };
  }

  async createInvitation(userId: string, relationship: string) {
    if (!allowedRelationships.has(relationship)) throw new BadRequestException("Unsupported relationship.");
    const primaryLinks = await this.prisma.childGuardian.findMany({ where: { userId, isPrimary: true },
      select: { childId: true, child: { select: { _count: { select: { childGuardians: true } } } } } });
    if (!primaryLinks.length) throw new ForbiddenException("Only a primary guardian can invite family.");
    if (!primaryLinks.some((x) => x.child._count.childGuardians < 3)) throw new BadRequestException("All children already have three guardians.");
    const pendingCount = await this.prisma.familyInvitation.count({ where: { invitedByUserId: userId,
      acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (pendingCount >= 2) throw new BadRequestException("At most two invitations may be pending.");
    const expiresAt = new Date(Date.now() + INVITE_TTL);
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const collision = await this.prisma.familyInvitation.findFirst({ where: { code, acceptedAt: null,
        revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
      if (collision) continue;
      const invitation = await this.prisma.familyInvitation.create({ data: { invitedByUserId: userId,
        relationship, code, expiresAt }, select: { id: true, code: true, expiresAt: true } });
      await this.audit.log({ actorUserId: userId, action: "family.invitation.created", entityType: "FamilyInvitation",
        entityId: invitation.id, metadata: { relationship } });
      return { ...invitation, expiresAt: invitation.expiresAt.toISOString() };
    }
    throw new BadRequestException("Could not allocate an invitation code. Please retry.");
  }

  async revokeInvitation(userId: string, invitationId: string) {
    const result = await this.prisma.familyInvitation.updateMany({ where: { id: invitationId,
      invitedByUserId: userId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() } });
    if (!result.count) throw new NotFoundException("Pending invitation not found.");
    await this.audit.log({ actorUserId: userId, action: "family.invitation.revoked", entityType: "FamilyInvitation", entityId: invitationId });
    return { success: true };
  }

  async removeGuardian(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestException("The primary guardian cannot be removed.");
    const childIds = (await this.prisma.childGuardian.findMany({ where: { userId, isPrimary: true }, select: { childId: true } })).map((x) => x.childId);
    if (!childIds.length) throw new ForbiddenException("Only a primary guardian can remove family.");
    const targetPrimary = await this.prisma.childGuardian.findFirst({ where: { userId: targetUserId, childId: { in: childIds }, isPrimary: true } });
    if (targetPrimary) throw new BadRequestException("A primary guardian cannot be removed.");
    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.childGuardian.deleteMany({ where: { userId: targetUserId, childId: { in: childIds }, isPrimary: false } });
      if (!removed.count) throw new NotFoundException("Family guardian not found.");
      await tx.authSession.updateMany({ where: { userId: targetUserId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log({ actorUserId: userId, action: "family.guardian.removed", entityType: "User", entityId: targetUserId }, tx);
    });
    return { success: true };
  }

  /** Bot-side lookup when a code is typed: validates it and returns what the invitee is joining. */
  async previewByCode(code: string) {
    const invitation = await this.prisma.familyInvitation.findFirst({ where: { code: code.replace(/\s/g, ""),
      acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { relationship: true, invitedByUserId: true, invitedByUser: { select: { fullName: true } } } });
    if (!invitation) return null;
    const links = await this.prisma.childGuardian.findMany({ where: { userId: invitation.invitedByUserId, isPrimary: true },
      select: { child: { select: { firstName: true, lastName: true } } } });
    return { inviterName: invitation.invitedByUser.fullName, relationship: invitation.relationship,
      childNames: links.map((l) => [l.child.firstName, l.child.lastName].filter(Boolean).join(" ")) };
  }

  async childNames(childIds: string[]) {
    if (!childIds.length) return [];
    const children = await this.prisma.child.findMany({ where: { id: { in: childIds } },
      select: { firstName: true, lastName: true } });
    return children.map((c) => [c.firstName, c.lastName].filter(Boolean).join(" "));
  }

  async acceptByTelegram(code: string, telegram: { id: bigint; username?: string; fullName: string; language?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.familyInvitation.findFirst({ where: { code: code.replace(/\s/g, ""),
        acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } });
      if (!invitation) throw new NotFoundException("Invitation is invalid or expired.");
      const user = await tx.user.upsert({ where: { telegramId: telegram.id }, update: {
        telegramUsername: telegram.username ?? null, fullName: telegram.fullName,
      }, create: { telegramId: telegram.id, telegramUsername: telegram.username ?? null,
        fullName: telegram.fullName, preferredLanguage: telegram.language ?? invitation.preferredLanguage ?? "uz" } });
      const parentRole = await tx.role.findUnique({ where: { name: "parent" }, select: { id: true } });
      if (parentRole) {
        const hasParentRole = await tx.userRole.findFirst({ where: { userId: user.id, roleId: parentRole.id }, select: { id: true } });
        if (!hasParentRole) await tx.userRole.create({ data: { userId: user.id, roleId: parentRole.id } });
      }
      const children = await tx.childGuardian.findMany({ where: { userId: invitation.invitedByUserId, isPrimary: true }, select: { childId: true } });
      const linked: string[] = [];
      for (const { childId } of children) {
        await tx.$queryRaw`SELECT id FROM child_guardians WHERE child_id = ${childId}::uuid FOR UPDATE`;
        if (await tx.childGuardian.count({ where: { childId } }) >= 3) continue;
        await tx.childGuardian.upsert({ where: { childId_userId: { childId, userId: user.id } }, update: {}, create: {
          childId, userId: user.id, relationship: invitation.relationship, isPrimary: false,
          accessLevel: "family", canPickup: false, canMessage: true,
        } });
        linked.push(childId);
      }
      await tx.familyInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date(), acceptedByUserId: user.id, telegramUserId: telegram.id } });
      await this.audit.log({ actorUserId: user.id, action: "family.invitation.accepted", entityType: "FamilyInvitation", entityId: invitation.id,
        metadata: { linkedChildIds: linked } }, tx);
      return { userId: user.id, linkedChildIds: linked };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
