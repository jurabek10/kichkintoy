import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Notification } from "@prisma/client";
import type {
  NotificationMetadataValue,
  NotificationSummary,
} from "@kichkintoy/shared";
import { PrismaService } from "../database/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

type ListOptions = {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
};

function isMetadataValue(value: unknown): value is NotificationMetadataValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return true;
  }

  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function mapMetadata(value: Prisma.JsonValue | null) {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;

  const entries = Object.entries(value).filter((entry): entry is [
    string,
    NotificationMetadataValue,
  ] => isMetadataValue(entry[1]));

  return Object.fromEntries(entries);
}

export function mapNotification(notification: Notification): NotificationSummary {
  return {
    id: notification.id,
    userId: notification.userId,
    notificationType: notification.notificationType,
    title: notification.title,
    body: notification.body,
    entityType: notification.entityType,
    entityId: notification.entityId,
    channel: "in_app",
    status: notification.status,
    priority:
      notification.priority === "high" || notification.priority === "urgent"
        ? notification.priority
        : "normal",
    metadata: mapMetadata(notification.metadata),
    sentAt: notification.sentAt?.toISOString() ?? null,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(userId: string, options: ListOptions = {}) {
    const limit = options.limit ?? 20;
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        channel: "in_app",
        ...(options.unreadOnly ? { readAt: null } : {}),
        ...(options.cursor
          ? { createdAt: { lt: new Date(options.cursor) } }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const next = rows.length > limit ? page.at(-1) : null;

    return {
      items: page.map(mapNotification),
      nextCursor: next?.createdAt.toISOString() ?? null,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, channel: "in_app", readAt: null },
    });

    return { count };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, channel: "in_app" },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: notification.readAt ?? new Date() },
    });

    await this.realtime.publishUnreadCount(userId);
    return mapNotification(updated);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, channel: "in_app", readAt: null },
      data: { readAt: new Date() },
    });

    await this.realtime.publishUnreadCount(userId);
    return this.unreadCount(userId);
  }
}
