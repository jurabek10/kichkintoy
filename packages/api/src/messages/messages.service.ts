import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  messageContactGroupSchema,
  messageLastReadSchema,
  messageSchema,
  threadDetailSchema,
  threadListResponseSchema,
  unreadMessageCountSchema,
  type MessageContact,
  type MessageContactRole,
  type MessageAttachment,
  type SendMessageInput,
  type StartThreadInput,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { splitPhotoRef } from "../common/comment-author";
import {
  linkMessageAttachments,
  loadMessageAttachments,
  messageKind,
  type MessageKind,
} from "./message-attachments";

type Tx = Prisma.TransactionClient;
type CenterScope = {
  centerId: string;
  centerName: string;
  organizationId: string;
  role: MessageContactRole;
};

const sendBuckets = new Map<string, number[]>();
const SEND_WINDOW_MS = 60_000;
const SEND_LIMIT = 30;
// A sender may edit their own text message for 48 hours after sending it.
const EDIT_WINDOW_MS = 48 * 60 * 60 * 1_000;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async contacts(userId: string, centerId?: string) {
    const scopes = await this.centerScopes(userId, centerId);
    const groups = await Promise.all(
      scopes.map(async (scope) => ({
        centerId: scope.centerId,
        centerName: scope.centerName,
        label: scope.centerName,
        contacts: await this.allowedContactsForScope(userId, scope),
      })),
    );
    return messageContactGroupSchema.array().parse(groups.filter((group) => group.contacts.length));
  }

  async threads(userId: string, page?: { cursor?: string; limit?: number }) {
    const limit = page?.limit ?? 10;
    const rows = await this.prisma.conversationThread.findMany({
      where: {
        threadType: "direct",
        participants: { some: { userId } },
      },
      include: {
        center: { select: { id: true, organizationId: true } },
        participants: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
      orderBy: [
        { lastMessageAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1,
      ...(page?.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = await Promise.all(rows.slice(0, limit).map((row) => this.toSummary(row, userId)));
    return threadListResponseSchema.parse({
      items,
      nextCursor: hasMore ? items.at(-1)?.threadId ?? null : null,
    });
  }

  async thread(
    userId: string,
    threadId: string,
    page: { cursor?: string; limit?: number } = {},
    markRead = true,
  ) {
    const thread = await this.requireParticipant(userId, threadId);
    const limit = page.limit ?? 10;
    const rows = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const attachments = await loadMessageAttachments(
      this.prisma,
      pageRows.filter((row) => !row.deletedAt).map((row) => row.id),
    );
    const nextCursor = hasMore ? pageRows.at(-1)?.id ?? null : null;
    // Older-page fetches must not re-trigger read receipts and realtime chatter.
    if (markRead && !page.cursor) await this.markRead(userId, threadId);
    return threadDetailSchema.parse({
      thread: await this.toSummary(thread, userId),
      messages: pageRows.reverse().map((row) => toMessage(row, attachments.get(row.id) ?? [])),
      nextCursor,
    });
  }

  async startThread(userId: string, input: StartThreadInput) {
    if (input.recipientUserId === userId) throw new BadRequestException("You cannot message yourself.");
    const matches = (await this.contacts(userId, input.centerId))
      .flatMap((group) => group.contacts)
      .filter((contact) => contact.userId === input.recipientUserId);
    if (!matches.length) throw new ForbiddenException("This person is not an allowed contact.");
    const centers = [...new Set(matches.map((contact) => contact.centerId))];
    if (centers.length !== 1) {
      throw new BadRequestException("Choose a center before starting this conversation.");
    }

    const body = input.body?.trim() || null;
    this.checkSendRate(userId);
    const created = await this.createOrReuseAndSend(
      userId,
      input.recipientUserId,
      centers[0],
      body,
      input.attachmentMediaAssetIds,
    );
    this.realtime.publishMessageCreated(
      [userId, input.recipientUserId],
      created.threadId,
      messageSchema.parse(toMessage(created.message, created.attachments)),
    );
    await this.notifyRecipient(created.threadId, userId, input.recipientUserId, body, created.kind);
    return this.thread(userId, created.threadId, { limit: 10 }, false);
  }

  async send(
    userId: string,
    threadId: string,
    input: SendMessageInput & { threadId?: string },
  ) {
    const thread = await this.requireParticipant(userId, threadId);
    this.checkSendRate(userId);
    const body = input.body?.trim() || null;
    const recipient = thread.participants.find((item) => item.userId !== userId);
    if (!recipient) throw new NotFoundException("Conversation not found.");
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({ data: { threadId, senderUserId: userId, body } });
      const kind = await linkMessageAttachments(tx, {
        mediaAssetIds: input.attachmentMediaAssetIds,
        centerId: thread.centerId,
        userId,
        messageId: created.id,
      });
      const updated = kind === "text"
        ? created
        : await tx.message.update({ where: { id: created.id }, data: { messageType: kind } });
      await tx.conversationThread.update({
        where: { id: threadId },
        data: {
          lastMessageAt: created.createdAt,
          lastMessagePreview: body ? preview(body) : "",
          lastMessageKind: kind,
        },
      });
      await this.audit.log(
        {
          organizationId: thread.center.organizationId,
          centerId: thread.centerId,
          actorUserId: userId,
          action: "message.sent",
          entityType: "message",
          entityId: created.id,
        },
        tx,
      );
      return { message: updated, kind };
    });
    const attachments = await loadMessageAttachments(this.prisma, [message.message.id]);
    const output = messageSchema.parse(
      toMessage(message.message, attachments.get(message.message.id) ?? []),
    );
    this.realtime.publishMessageCreated([userId, recipient.userId], threadId, output);
    await this.notifyRecipient(threadId, userId, recipient.userId, body, message.kind);
    return output;
  }

  async markRead(userId: string, threadId: string) {
    const thread = await this.requireParticipant(userId, threadId);
    const lastReadAt = new Date();
    await this.prisma.conversationParticipant.update({
      where: { threadId_userId: { threadId, userId } },
      data: { lastReadAt },
    });
    const output = messageLastReadSchema.parse({ lastReadAt: lastReadAt.toISOString() });
    this.realtime.publishThreadRead(
      thread.participants.map((participant) => participant.userId),
      threadId,
      userId,
      output.lastReadAt,
    );
    return output;
  }

  async deleteMessage(userId: string, messageId: string) {
    const existing = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { thread: { include: { center: { select: { organizationId: true } } } } },
    });
    if (!existing || existing.senderUserId !== userId) throw new NotFoundException("Message not found.");
    const thread = await this.requireParticipant(userId, existing.threadId);
    if (existing.deletedAt) return messageSchema.parse(toMessage(existing, []));
    const deleted = await this.prisma.$transaction(async (tx) => {
      const row = await tx.message.update({
        where: { id: messageId },
        data: { body: null, deletedAt: new Date() },
      });
      const latest = await tx.message.findFirst({
        where: { threadId: existing.threadId, deletedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      await tx.conversationThread.update({
        where: { id: existing.threadId },
        data: {
          lastMessageAt: latest?.createdAt ?? null,
          lastMessagePreview: latest?.body ? preview(latest.body) : "",
          lastMessageKind: messageKind(latest?.messageType),
        },
      });
      await this.audit.log(
        {
          organizationId: existing.thread.center.organizationId,
          centerId: existing.thread.centerId,
          actorUserId: userId,
          action: "message.deleted",
          entityType: "message",
          entityId: messageId,
        },
        tx,
      );
      return row;
    });
    const output = messageSchema.parse(toMessage(deleted, []));
    this.realtime.publishMessageDeleted(
      thread.participants.map((participant) => participant.userId),
      existing.threadId,
      output,
    );
    return output;
  }

  async editMessage(userId: string, messageId: string, body: string) {
    const existing = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { thread: { include: { center: { select: { organizationId: true } } } } },
    });
    if (!existing || existing.senderUserId !== userId) throw new NotFoundException("Message not found.");
    if (existing.deletedAt) throw new BadRequestException("A deleted message cannot be edited.");
    if (existing.messageType !== "text") {
      throw new BadRequestException("Only text messages can be edited.");
    }
    if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS) {
      throw new BadRequestException("This message can no longer be edited.");
    }
    const thread = await this.requireParticipant(userId, existing.threadId);
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestException("A message needs text.");

    const edited = await this.prisma.$transaction(async (tx) => {
      const row = await tx.message.update({
        where: { id: messageId },
        data: { body: trimmed, editedAt: new Date() },
      });
      // Keep the thread list preview in sync when the edited message is the last one.
      const latest = await tx.message.findFirst({
        where: { threadId: existing.threadId, deletedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      if (latest?.id === messageId) {
        await tx.conversationThread.update({
          where: { id: existing.threadId },
          data: { lastMessagePreview: preview(trimmed) },
        });
      }
      await this.audit.log(
        {
          organizationId: existing.thread.center.organizationId,
          centerId: existing.thread.centerId,
          actorUserId: userId,
          action: "message.edited",
          entityType: "message",
          entityId: messageId,
        },
        tx,
      );
      return row;
    });
    const attachments = await loadMessageAttachments(this.prisma, [messageId]);
    const output = messageSchema.parse(toMessage(edited, attachments.get(messageId) ?? []));
    this.realtime.publishMessageUpdated(
      thread.participants.map((participant) => participant.userId),
      existing.threadId,
      output,
    );
    return output;
  }

  async unreadCount(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId, thread: { threadType: "direct" } },
      select: { threadId: true, lastReadAt: true },
    });
    const counts = await Promise.all(
      participants.map((participant) =>
        this.prisma.message.count({
          where: {
            threadId: participant.threadId,
            senderUserId: { not: userId },
            deletedAt: null,
            ...(participant.lastReadAt ? { createdAt: { gt: participant.lastReadAt } } : {}),
          },
        }),
      ),
    );
    return unreadMessageCountSchema.parse({ total: counts.reduce((sum, value) => sum + value, 0) });
  }

  private async createOrReuseAndSend(
    senderUserId: string,
    recipientUserId: string,
    centerId: string,
    body: string | null,
    attachmentMediaAssetIds: string[],
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const candidates = await tx.conversationThread.findMany({
              where: {
                centerId,
                threadType: "direct",
                participants: { some: { userId: senderUserId } },
                AND: { participants: { some: { userId: recipientUserId } } },
              },
              include: { participants: { select: { userId: true } }, center: true },
            });
            let thread = candidates.find(
              (candidate) =>
                candidate.participants.length === 2 &&
                candidate.participants.every((p) =>
                  p.userId === senderUserId || p.userId === recipientUserId,
                ),
            );
            if (!thread) {
              thread = await tx.conversationThread.create({
                data: {
                  centerId,
                  threadType: "direct",
                  participants: {
                    create: [{ userId: senderUserId }, { userId: recipientUserId }],
                  },
                },
                include: { participants: { select: { userId: true } }, center: true },
              });
              await this.audit.log(
                {
                  organizationId: thread.center.organizationId,
                  centerId,
                  actorUserId: senderUserId,
                  action: "thread.created",
                  entityType: "conversation_thread",
                  entityId: thread.id,
                },
                tx,
              );
            }
            const message = await tx.message.create({
              data: { threadId: thread.id, senderUserId, body },
            });
            const kind = await linkMessageAttachments(tx, {
              mediaAssetIds: attachmentMediaAssetIds,
              centerId,
              userId: senderUserId,
              messageId: message.id,
            });
            const updatedMessage = kind === "text"
              ? message
              : await tx.message.update({ where: { id: message.id }, data: { messageType: kind } });
            await tx.conversationThread.update({
              where: { id: thread.id },
              data: {
                lastMessageAt: message.createdAt,
                lastMessagePreview: body ? preview(body) : "",
                lastMessageKind: kind,
              },
            });
            await this.audit.log(
              {
                organizationId: thread.center.organizationId,
                centerId,
                actorUserId: senderUserId,
                action: "message.sent",
                entityType: "message",
                entityId: message.id,
              },
              tx,
            );
            const attachments = await loadMessageAttachments(tx, [message.id]);
            return {
              threadId: thread.id,
              message: updatedMessage,
              attachments: attachments.get(message.id) ?? [],
              kind,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) {
          throw error;
        }
      }
    }
    throw new BadRequestException("Could not start the conversation.");
  }

  private async requireParticipant(userId: string, threadId: string) {
    const thread = await this.prisma.conversationThread.findFirst({
      where: { id: threadId, threadType: "direct", participants: { some: { userId } } },
      include: {
        center: { select: { id: true, organizationId: true } },
        participants: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
    });
    if (!thread || thread.participants.length !== 2) throw new NotFoundException("Conversation not found.");
    return thread;
  }

  private async toSummary(
    thread: Awaited<ReturnType<MessagesService["requireParticipant"]>>,
    userId: string,
  ) {
    const me = thread.participants.find((item) => item.userId === userId);
    const other = thread.participants.find((item) => item.userId !== userId);
    if (!me || !other) throw new NotFoundException("Conversation not found.");
    const unreadCount = await this.prisma.message.count({
      where: {
        threadId: thread.id,
        senderUserId: { not: userId },
        deletedAt: null,
        ...(me.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
      },
    });
    const role = await this.roleInCenter(
      other.userId,
      thread.centerId,
      thread.center.organizationId,
    );
    const identity =
      role === "parent"
        ? await this.parentIdentityForViewer(userId, other.user, thread.centerId, thread.center.organizationId)
        : {
            displayName: other.user.fullName,
            parentContext: null,
            ...splitPhotoRef(other.user.avatarUrl),
          };
    return {
      threadId: thread.id,
      centerId: thread.centerId,
      otherParticipant: {
        userId: other.userId,
        displayName: identity.displayName,
        photoMediaAssetId: identity.photoMediaAssetId,
        photoUrl: identity.photoUrl,
        role,
        parentContext: identity.parentContext,
      },
      lastMessagePreview: thread.lastMessagePreview,
      lastMessageKind: messageKind(thread.lastMessageKind),
      lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
      unreadCount,
      otherLastReadAt: other.lastReadAt?.toISOString() ?? null,
    };
  }

  private async centerScopes(userId: string, onlyCenterId?: string): Promise<CenterScope[]> {
    const directRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: { name: { in: ["teacher", "director", "organization_owner"] } },
        ...(onlyCenterId ? { OR: [{ centerId: onlyCenterId }, { centerId: null }] } : {}),
      },
      include: {
        role: { select: { name: true } },
        center: { select: { id: true, name: true, organizationId: true } },
        organization: {
          select: {
            centers: {
              where: { status: "active", ...(onlyCenterId ? { id: onlyCenterId } : {}) },
              select: { id: true, name: true, organizationId: true },
            },
          },
        },
      },
    });
    const parentEnrollments = await this.prisma.childEnrollment.findMany({
      where: {
        enrollmentStatus: "active",
        ...(onlyCenterId ? { centerId: onlyCenterId } : {}),
        child: { childGuardians: { some: { userId, canMessage: true } } },
      },
      select: { center: { select: { id: true, name: true, organizationId: true } } },
    });
    const scopes = new Map<string, CenterScope>();
    const put = (center: { id: string; name: string; organizationId: string }, role: MessageContactRole) => {
      const current = scopes.get(center.id);
      const weight = { parent: 1, teacher: 2, director: 3 };
      if (!current || weight[role] > weight[current.role]) {
        scopes.set(center.id, {
          centerId: center.id,
          centerName: center.name,
          organizationId: center.organizationId,
          role,
        });
      }
    };
    for (const item of parentEnrollments) put(item.center, "parent");
    for (const item of directRoles) {
      const role = item.role.name === "teacher" ? "teacher" : "director";
      if (item.center) put(item.center, role);
      for (const center of item.organization?.centers ?? []) put(center, role);
    }
    return [...scopes.values()].sort((a, b) => a.centerName.localeCompare(b.centerName));
  }

  private async allowedContactsForScope(userId: string, scope: CenterScope): Promise<MessageContact[]> {
    const contacts = new Map<string, MessageContact>();
    const add = (contact: MessageContact) => {
      if (contact.userId !== userId && !contacts.has(contact.userId)) contacts.set(contact.userId, contact);
    };
    const directors = await this.directors(
      scope.centerId,
      scope.organizationId,
      scope.role !== "parent",
    );
    if (scope.role !== "director") directors.forEach(add);

    if (scope.role === "parent") {
      const enrollments = await this.prisma.childEnrollment.findMany({
        where: {
          centerId: scope.centerId,
          enrollmentStatus: "active",
          classId: { not: null },
          child: { childGuardians: { some: { userId, canMessage: true } } },
        },
        select: {
          classId: true,
          class: {
            select: {
              name: true,
              teacherClassAssignments: {
                where: {
                  ...activeAssignmentWhere(),
                  teacherUser: { status: "active" },
                },
                select: { teacherUser: { select: { id: true, fullName: true, avatarUrl: true } } },
              },
            },
          },
        },
      });
      for (const enrollment of enrollments) {
        for (const assignment of enrollment.class?.teacherClassAssignments ?? []) {
          add(contact(assignment.teacherUser, "teacher", scope.centerId, enrollment.class?.name ?? null));
        }
      }
    } else if (scope.role === "teacher") {
      const assignments = await this.prisma.teacherClassAssignment.findMany({
        where: { teacherUserId: userId, class: { centerId: scope.centerId }, ...activeAssignmentWhere() },
        select: {
          class: {
            select: {
              name: true,
              childEnrollments: {
                where: { enrollmentStatus: "active" },
                select: {
                  child: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      photoUrl: true,
                      childGuardians: {
                        where: { canMessage: true },
                        select: {
                          relationship: true,
                          isPrimary: true,
                          user: { select: { id: true, fullName: true, avatarUrl: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const parentCandidates: Array<{ contact: MessageContact; primary: boolean }> = [];
      for (const assignment of assignments) {
        for (const enrollment of assignment.class.childEnrollments) {
          for (const guardian of enrollment.child.childGuardians) {
            parentCandidates.push({
              primary: guardian.isPrimary,
              contact: parentContact(
                guardian.user,
                enrollment.child,
                assignment.class.name,
                guardian.relationship,
                scope.centerId,
              ),
            });
          }
        }
      }
      parentCandidates
        .sort((a, b) => Number(b.primary) - Number(a.primary) || a.contact.displayName.localeCompare(b.contact.displayName))
        .forEach((candidate) => add(candidate.contact));
    } else {
      const [teachers, enrollments] = await Promise.all([
        this.prisma.userRole.findMany({
          where: { centerId: scope.centerId, role: { name: "teacher" }, user: { status: "active" } },
          select: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        }),
        this.prisma.childEnrollment.findMany({
          where: { centerId: scope.centerId, enrollmentStatus: "active" },
          select: {
            class: { select: { name: true } },
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                childGuardians: {
                  where: { canMessage: true },
                  select: {
                    relationship: true,
                    isPrimary: true,
                    user: { select: { id: true, fullName: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        }),
      ]);
      teachers.forEach((item) => add(contact(item.user, "teacher", scope.centerId, null)));
      const parentCandidates = enrollments.flatMap((enrollment) =>
        enrollment.child.childGuardians.map((guardian) => ({
          primary: guardian.isPrimary,
          contact: parentContact(
            guardian.user,
            enrollment.child,
            enrollment.class?.name ?? scope.centerName,
            guardian.relationship,
            scope.centerId,
          ),
        })),
      );
      parentCandidates
        .sort((a, b) => Number(b.primary) - Number(a.primary) || a.contact.displayName.localeCompare(b.contact.displayName))
        .forEach((candidate) => add(candidate.contact));
    }
    return [...contacts.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  private async directors(
    centerId: string,
    organizationId: string,
    includeOrganizationOwner = true,
  ) {
    const roles = await this.prisma.userRole.findMany({
      where: {
        user: { status: "active" },
        OR: [
          { centerId, role: { name: "director" } },
          ...(includeOrganizationOwner
            ? [{ organizationId, centerId: null, role: { name: "organization_owner" } }]
            : []),
        ],
      },
      select: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
    return roles.map((item) => contact(item.user, "director", centerId, null));
  }

  private async roleInCenter(userId: string, centerId: string, organizationId: string): Promise<MessageContactRole> {
    const staff = await this.prisma.userRole.findFirst({
      where: {
        userId,
        OR: [
          { centerId, role: { name: { in: ["director", "teacher"] } } },
          { organizationId, centerId: null, role: { name: "organization_owner" } },
        ],
      },
      include: { role: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    if (!staff) return "parent";
    return staff.role.name === "teacher" ? "teacher" : "director";
  }

  private async parentIdentityForViewer(
    viewerUserId: string,
    parent: { id: string; fullName: string; avatarUrl: string | null },
    centerId: string,
    organizationId: string,
  ) {
    const viewerRole = await this.roleInCenter(viewerUserId, centerId, organizationId);
    const enrollments = await this.prisma.childEnrollment.findMany({
      where: {
        centerId,
        enrollmentStatus: "active",
        classId: { not: null },
        child: { childGuardians: { some: { userId: parent.id, canMessage: true } } },
        ...(viewerRole === "teacher"
          ? {
              class: {
                teacherClassAssignments: {
                  some: { teacherUserId: viewerUserId, ...activeAssignmentWhere() },
                },
              },
            }
          : {}),
      },
      select: {
        class: { select: { name: true } },
        child: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true,
            childGuardians: {
              where: { userId: parent.id, canMessage: true },
              select: { relationship: true, isPrimary: true },
            },
          },
        },
      },
    });
    const selected = enrollments
      .map((enrollment) => ({ enrollment, guardian: enrollment.child.childGuardians[0] }))
      .filter((item) => item.guardian)
      .sort(
        (a, b) =>
          Number(b.guardian!.isPrimary) - Number(a.guardian!.isPrimary) ||
          childName(a.enrollment.child).localeCompare(childName(b.enrollment.child)),
      )[0];
    if (!selected?.enrollment.class || !selected.guardian) {
      return {
        displayName: parent.fullName,
        parentContext: null,
        ...splitPhotoRef(parent.avatarUrl),
      };
    }
    return {
      displayName: parent.fullName,
      parentContext: {
        className: selected.enrollment.class.name,
        childName: childName(selected.enrollment.child),
        relationship: selected.guardian.relationship,
      },
      ...splitPhotoRef(selected.enrollment.child.photoUrl),
    };
  }

  private async notifyRecipient(
    threadId: string,
    senderUserId: string,
    recipientUserId: string,
    body: string | null,
    kind: MessageKind,
  ) {
    const [sender, recipient] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: senderUserId }, select: { fullName: true } }),
      this.prisma.user.findUnique({
        where: { id: recipientUserId },
        select: { userNotificationSettings: { select: { pushEnabled: true } } },
      }),
    ]);
    if (!sender || !recipient) return;
    await this.notifications.enqueue({
      userId: recipientUserId,
      notificationType: "message.received",
      title: "New message",
      body: body ? `${sender.fullName}: ${preview(body)}` : null,
      entityType: "conversation_thread",
      entityId: threadId,
      metadata: { threadId, messageKind: kind, senderName: sender.fullName },
      channels: recipient.userNotificationSettings?.pushEnabled === false ? ["in_app"] : ["in_app", "push"],
    });
  }

  private checkSendRate(userId: string) {
    const now = Date.now();
    const recent = (sendBuckets.get(userId) ?? []).filter((time) => now - time < SEND_WINDOW_MS);
    if (recent.length >= SEND_LIMIT) throw new BadRequestException("Too many messages. Please wait a moment.");
    recent.push(now);
    sendBuckets.set(userId, recent);
  }
}

function activeAssignmentWhere(): Prisma.TeacherClassAssignmentWhereInput {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return {
    startedAt: { lte: today },
    OR: [{ endedAt: null }, { endedAt: { gte: today } }],
  };
}

function contact(
  user: { id: string; fullName: string; avatarUrl: string | null },
  role: MessageContactRole,
  centerId: string,
  classLabel: string | null,
): MessageContact {
  return {
    userId: user.id,
    displayName: user.fullName,
    ...splitPhotoRef(user.avatarUrl),
    role,
    parentContext: null,
    classLabel,
    centerId,
  };
}

function parentContact(
  user: { id: string; fullName: string; avatarUrl: string | null },
  child: { firstName: string; lastName: string | null; photoUrl: string | null },
  className: string,
  relationship: string,
  centerId: string,
): MessageContact {
  return {
    userId: user.id,
    displayName: user.fullName,
    ...splitPhotoRef(child.photoUrl),
    role: "parent",
    parentContext: {
      className,
      childName: childName(child),
      relationship,
    },
    classLabel: null,
    centerId,
  };
}

function childName(child: { firstName: string; lastName: string | null }) {
  return child.firstName;
}

function preview(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 120);
}

function toMessage(message: {
  id: string;
  senderUserId: string;
  body: string | null;
  deletedAt: Date | null;
  editedAt: Date | null;
  createdAt: Date;
}, attachments: MessageAttachment[]) {
  return {
    id: message.id,
    senderUserId: message.senderUserId,
    body: message.body,
    attachments: message.deletedAt ? [] : attachments,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    editedAt: message.editedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}
