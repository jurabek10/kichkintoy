import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  complaintDetailSchema,
  complaintListResponseSchema,
  complaintOpenCountSchema,
  type ComplaintCategory,
  type ComplaintStatus,
  type CreateComplaintInput,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { splitPhotoRef } from "../common/comment-author";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const detailInclude = Prisma.validator<Prisma.ComplaintInclude>()({
  center: { select: { organizationId: true } },
  class: { select: { name: true } },
  child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
  parentUser: { select: { id: true, fullName: true, avatarUrl: true } },
  replies: {
    include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  statusEvents: {
    include: { actor: { select: { id: true, fullName: true, avatarUrl: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
});
type ComplaintRow = Prisma.ComplaintGetPayload<{ include: typeof detailInclude }>;

type Page = { cursor?: string; limit?: number };
type StaffListInput = Page & {
  centerId: string;
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  classId?: string;
  from?: string;
};

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, input: CreateComplaintInput) {
    const enrollment = await this.prisma.childEnrollment.findFirst({
      where: {
        childId: input.childId,
        enrollmentStatus: "active",
        child: { childGuardians: { some: { userId } } },
      },
      include: {
        center: { select: { id: true, organizationId: true } },
        child: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startedAt: "desc" },
    });
    if (!enrollment) throw new NotFoundException("Child not found.");

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.prisma.complaint.count({
      where: { parentUserId: userId, createdAt: { gte: dayAgo } },
    });
    if (recentCount >= 10) throw new HttpException("Complaint limit reached. Try again later.", HttpStatus.TOO_MANY_REQUESTS);

    const complaint = await this.prisma.$transaction(async (tx) => {
      const created = await tx.complaint.create({
        data: {
          centerId: enrollment.centerId,
          classId: enrollment.classId,
          childId: input.childId,
          parentUserId: userId,
          category: input.category,
          subject: input.subject.trim(),
          body: input.body.trim(),
          visibility: input.visibility,
        },
      });
      await this.audit.log({
        organizationId: enrollment.center.organizationId,
        centerId: enrollment.centerId,
        actorUserId: userId,
        action: "complaint.created",
        entityType: "complaint",
        entityId: created.id,
        metadata: { category: input.category, visibility: input.visibility },
      }, tx);
      return created;
    });

    const parent = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { fullName: true } });
    const recipients = await this.staffRecipients(complaint.centerId, complaint.classId, complaint.visibility);
    await this.notifyMany(recipients, {
      notificationType: "complaint.created",
      title: "New complaint",
      body: `${parent.fullName} filed a complaint about ${input.category}.`,
      complaintId: complaint.id,
    });
    return this.detail(userId, complaint.id);
  }

  async parentList(userId: string, page?: Page & { childId?: string; status?: ComplaintStatus }) {
    const limit = page?.limit ?? 10;
    const rows = await this.prisma.complaint.findMany({
      where: { parentUserId: userId, ...(page?.childId ? { childId: page.childId } : {}), ...(page?.status ? { status: page.status } : {}) },
      include: detailInclude,
      orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(page?.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    return this.listOutput(rows, limit);
  }

  async staffList(userId: string, input: StaffListInput) {
    const access = await this.staffAccess(userId, input.centerId);
    if (!access) throw new NotFoundException("Center not found.");
    const limit = input.limit ?? 10;
    if (access === "teacher" && input.status === "withdrawn") {
      return complaintListResponseSchema.parse({ items: [], nextCursor: null });
    }
    const where: Prisma.ComplaintWhereInput = {
      centerId: input.centerId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.classId ? { classId: input.classId } : {}),
      ...(input.from ? { createdAt: { gte: new Date(input.from) } } : {}),
      ...(access === "teacher" ? {
        visibility: "teacher_and_director",
        status: input.status ?? { not: "withdrawn" },
        classId: { in: await this.assignedClassIds(userId, input.centerId) },
      } : {}),
    };
    const rows = await this.prisma.complaint.findMany({
      where,
      include: detailInclude,
      orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    return this.listOutput(rows, limit);
  }

  async detail(userId: string, complaintId: string) {
    const row = await this.prisma.complaint.findUnique({ where: { id: complaintId }, include: detailInclude });
    if (!row || !(await this.canRead(userId, row))) throw new NotFoundException("Complaint not found.");
    return complaintDetailSchema.parse(this.toDetail(row));
  }

  async reply(userId: string, complaintId: string, bodyInput: string) {
    const existing = await this.prisma.complaint.findUnique({ where: { id: complaintId }, include: detailInclude });
    if (!existing || !(await this.canRead(userId, existing)) || existing.status === "withdrawn") {
      throw new NotFoundException("Complaint not found.");
    }
    const isParent = existing.parentUserId === userId;
    if (!isParent && existing.status === "resolved") throw new BadRequestException("Resolved complaints can only be reopened by the parent.");
    const body = bodyInput.trim();
    const reopened = isParent && existing.status === "resolved";

    await this.prisma.$transaction(async (tx) => {
      const reply = await tx.complaintReply.create({ data: { complaintId, senderUserId: userId, body } });
      if (reopened) {
        await tx.complaintStatusEvent.create({ data: { complaintId, actorUserId: userId, fromStatus: "resolved", toStatus: "open" } });
      }
      await tx.complaint.update({
        where: { id: complaintId },
        data: { status: reopened ? "open" : undefined, resolvedAt: reopened ? null : undefined, resolvedByUserId: reopened ? null : undefined, resolutionNote: reopened ? null : undefined, lastActivityAt: reply.createdAt },
      });
      await this.audit.log({
        organizationId: existing.center.organizationId,
        centerId: existing.centerId,
        actorUserId: userId,
        action: "complaint.replied",
        entityType: "complaint_reply",
        entityId: reply.id,
      }, tx);
      if (reopened) await this.audit.log({
        organizationId: existing.center.organizationId, centerId: existing.centerId, actorUserId: userId,
        action: "complaint.status_changed", entityType: "complaint", entityId: complaintId,
        metadata: { fromStatus: "resolved", toStatus: "open" },
      }, tx);
    });

    const sender = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { fullName: true } });
    if (isParent) {
      const recipients = await this.staffRecipients(existing.centerId, existing.classId, existing.visibility);
      await this.notifyMany(recipients, {
        notificationType: reopened ? "complaint.reopened" : "complaint.replied",
        title: reopened ? "Complaint reopened" : "New reply to a complaint",
        body: reopened ? `${sender.fullName} replied to a resolved complaint.` : `${sender.fullName} replied: ${preview(body)}`,
        complaintId,
      });
    } else {
      await this.notifyMany([existing.parentUserId], { notificationType: "complaint.replied", title: "New reply to your complaint", body: `${sender.fullName} replied: ${preview(body)}`, complaintId });
    }
    return this.detail(userId, complaintId);
  }

  async setStatus(userId: string, input: { complaintId: string; status: "in_progress" | "resolved"; resolutionNote?: string }) {
    const existing = await this.prisma.complaint.findUnique({ where: { id: input.complaintId }, include: detailInclude });
    if (!existing || !(await this.canStaffRead(userId, existing)) || existing.status === "withdrawn") throw new NotFoundException("Complaint not found.");
    if (input.status === "resolved" && !input.resolutionNote?.trim()) throw new BadRequestException("A resolution note is required.");
    if (existing.status === input.status) return this.detail(userId, input.complaintId);
    if (existing.status === "resolved") throw new BadRequestException("A resolved complaint can only be reopened by a parent reply.");
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.complaintStatusEvent.create({ data: { complaintId: input.complaintId, actorUserId: userId, fromStatus: existing.status, toStatus: input.status, note: input.status === "resolved" ? input.resolutionNote!.trim() : null } });
      await tx.complaint.update({ where: { id: input.complaintId }, data: { status: input.status, lastActivityAt: now, resolvedByUserId: input.status === "resolved" ? userId : null, resolvedAt: input.status === "resolved" ? now : null, resolutionNote: input.status === "resolved" ? input.resolutionNote!.trim() : null } });
      await this.audit.log({ organizationId: existing.center.organizationId, centerId: existing.centerId, actorUserId: userId, action: "complaint.status_changed", entityType: "complaint", entityId: input.complaintId, metadata: { fromStatus: existing.status, toStatus: input.status } }, tx);
    });
    await this.notifyMany([existing.parentUserId], {
      notificationType: input.status === "resolved" ? "complaint.resolved" : "complaint.in_progress",
      title: input.status === "resolved" ? "Complaint resolved" : "Complaint update",
      body: input.status === "resolved" ? "Your complaint was resolved. Read the resolution note." : "Your complaint is being reviewed.",
      complaintId: input.complaintId,
    });
    return this.detail(userId, input.complaintId);
  }

  async withdraw(userId: string, complaintId: string) {
    const existing = await this.prisma.complaint.findFirst({ where: { id: complaintId, parentUserId: userId }, include: detailInclude });
    if (!existing) throw new NotFoundException("Complaint not found.");
    if (existing.status === "resolved") throw new BadRequestException("A resolved complaint cannot be withdrawn.");
    if (existing.status === "withdrawn") return this.detail(userId, complaintId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.complaintStatusEvent.create({ data: { complaintId, actorUserId: userId, fromStatus: existing.status, toStatus: "withdrawn" } });
      await tx.complaint.update({ where: { id: complaintId }, data: { status: "withdrawn", lastActivityAt: now } });
      await this.audit.log({ organizationId: existing.center.organizationId, centerId: existing.centerId, actorUserId: userId, action: "complaint.withdrawn", entityType: "complaint", entityId: complaintId }, tx);
    });
    return this.detail(userId, complaintId);
  }

  async openCount(userId: string, centerId: string) {
    const access = await this.staffAccess(userId, centerId);
    if (!access) throw new NotFoundException("Center not found.");
    const total = await this.prisma.complaint.count({ where: { centerId, status: { in: ["open", "in_progress"] }, ...(access === "teacher" ? { visibility: "teacher_and_director", classId: { in: await this.assignedClassIds(userId, centerId) } } : {}) } });
    return complaintOpenCountSchema.parse({ total });
  }

  private listOutput(rows: ComplaintRow[], limit: number) {
    const pageRows = rows.slice(0, limit);
    return complaintListResponseSchema.parse({ items: pageRows.map((row) => this.toSummary(row)), nextCursor: rows.length > limit ? pageRows.at(-1)?.id ?? null : null });
  }

  private toSummary(row: ComplaintRow) {
    return {
      id: row.id, centerId: row.centerId, classId: row.classId, classLabel: row.class?.name ?? null,
      child: { id: row.child.id, displayName: [row.child.firstName, row.child.lastName].filter(Boolean).join(" "), ...splitPhotoRef(row.child.photoUrl) },
      category: row.category, subject: row.subject, status: row.status, visibility: row.visibility,
      createdAt: row.createdAt.toISOString(), lastActivityAt: row.lastActivityAt.toISOString(),
    };
  }

  private toDetail(row: ComplaintRow) {
    return {
      ...this.toSummary(row), body: row.body, parent: person(row.parentUser), resolutionNote: row.resolutionNote,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      replies: row.replies.map((reply) => ({ id: reply.id, complaintId: row.id, sender: person(reply.sender), body: reply.body, createdAt: reply.createdAt.toISOString() })),
      statusEvents: row.statusEvents.map((event) => ({ id: event.id, complaintId: row.id, actor: person(event.actor), fromStatus: event.fromStatus, toStatus: event.toStatus, note: event.note, createdAt: event.createdAt.toISOString() })),
    };
  }

  private async canRead(userId: string, row: ComplaintRow) {
    return row.parentUserId === userId || this.canStaffRead(userId, row);
  }

  private async canStaffRead(userId: string, row: ComplaintRow) {
    const access = await this.staffAccess(userId, row.centerId);
    if (access === "director") return true;
    if (access !== "teacher" || row.visibility !== "teacher_and_director" || row.status === "withdrawn" || !row.classId) return false;
    return (await this.assignedClassIds(userId, row.centerId)).includes(row.classId);
  }

  private async staffAccess(userId: string, centerId: string): Promise<"director" | "teacher" | null> {
    const center = await this.prisma.center.findUnique({ where: { id: centerId }, select: { organizationId: true } });
    if (!center) return null;
    const roles = await this.prisma.userRole.findMany({ where: { userId, role: { name: { in: ["director", "organization_owner", "teacher"] } }, OR: [{ centerId }, { organizationId: center.organizationId, centerId: null }] }, select: { role: { select: { name: true } } } });
    if (roles.some((item) => item.role.name === "director" || item.role.name === "organization_owner")) return "director";
    return roles.some((item) => item.role.name === "teacher") ? "teacher" : null;
  }

  private assignedClassIds(userId: string, centerId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.prisma.teacherClassAssignment.findMany({ where: { teacherUserId: userId, class: { centerId }, startedAt: { lte: today }, OR: [{ endedAt: null }, { endedAt: { gte: today } }] }, select: { classId: true } }).then((rows) => rows.map((row) => row.classId));
  }

  private async staffRecipients(centerId: string, classId: string | null, visibility: string) {
    const center = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId }, select: { organizationId: true } });
    const directors = await this.prisma.userRole.findMany({ where: { role: { name: { in: ["director", "organization_owner"] } }, OR: [{ centerId }, { organizationId: center.organizationId, centerId: null }] }, select: { userId: true } });
    const teachers = visibility === "teacher_and_director" && classId ? await this.prisma.teacherClassAssignment.findMany({ where: { classId, endedAt: null }, select: { teacherUserId: true } }) : [];
    return [...new Set([...directors.map((row) => row.userId), ...teachers.map((row) => row.teacherUserId)])];
  }

  private notifyMany(userIds: string[], input: { notificationType: string; title: string; body: string; complaintId: string }) {
    return Promise.all([...new Set(userIds)].map((userId) => this.notifications.enqueue({ userId, notificationType: input.notificationType, title: input.title, body: input.body, entityType: "complaint", entityId: input.complaintId, metadata: { complaintId: input.complaintId }, channels: ["in_app", "push"] })));
  }
}

function person(user: { id: string; fullName: string; avatarUrl: string | null }) {
  return { userId: user.id, displayName: user.fullName, ...splitPhotoRef(user.avatarUrl) };
}

function preview(body: string) { return body.length > 100 ? `${body.slice(0, 97)}…` : body; }
