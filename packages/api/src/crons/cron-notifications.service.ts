import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  NotificationsService,
  type EnqueueNotificationInput,
} from "../notifications/notifications.service";
import { tashkentDayBounds } from "./cron-date";

@Injectable()
export class CronNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async enqueueOnceForDay(
    input: EnqueueNotificationInput,
    date: string,
    entityScoped = true,
  ): Promise<boolean> {
    const { start, end } = tashkentDayBounds(date);
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: input.userId,
        notificationType: input.notificationType,
        ...(entityScoped ? { entityId: input.entityId ?? null } : {}),
        channel: "in_app",
        createdAt: { gte: start, lt: end },
      },
      select: { id: true },
    });
    if (existing) return false;
    const rows = await this.notifications.enqueue({
      ...input,
      dedupeKey: cronDedupeKey(
        input.notificationType,
        input.userId,
        entityScoped ? (input.entityId ?? "none") : "all",
        date,
      ),
    });
    return rows.length > 0;
  }

  async enqueueDocumentReminderOnce(
    input: EnqueueNotificationInput,
    requestId: string,
    childId: string,
    daysLeft: number,
  ): Promise<boolean> {
    const candidates = await this.prisma.notification.findMany({
      where: {
        userId: input.userId,
        notificationType: input.notificationType,
        entityId: requestId,
        channel: "in_app",
      },
      select: { metadata: true },
    });
    const duplicate = candidates.some((row) => {
      const metadata = asObject(row.metadata);
      return metadata?.childId === childId && metadata?.daysLeft === daysLeft;
    });
    if (duplicate) return false;
    const rows = await this.notifications.enqueue({
      ...input,
      dedupeKey: cronDedupeKey(
        input.notificationType,
        input.userId,
        requestId,
        childId,
        daysLeft,
      ),
    });
    return rows.length > 0;
  }

  async enqueueWeeklyRecapOnce(
    input: EnqueueNotificationInput,
    childId: string,
    weekStart: string,
  ): Promise<boolean> {
    const candidates = await this.prisma.notification.findMany({
      where: {
        userId: input.userId,
        notificationType: input.notificationType,
        entityId: childId,
        channel: "in_app",
      },
      select: { metadata: true },
    });
    if (
      candidates.some((row) => asObject(row.metadata)?.weekStart === weekStart)
    )
      return false;
    const rows = await this.notifications.enqueue({
      ...input,
      dedupeKey: cronDedupeKey(
        input.notificationType,
        input.userId,
        childId,
        weekStart,
      ),
    });
    return rows.length > 0;
  }

  async previouslyNudgedNoticeIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        notificationType: "notice.unread_nudge",
        channel: "in_app",
      },
      select: { entityId: true, metadata: true },
    });
    const ids = new Set<string>();
    for (const row of rows) {
      if (row.entityId) ids.add(row.entityId);
      if (Array.isArray(row.metadata)) {
        for (const value of row.metadata) {
          const item = asObject(value);
          if (typeof item?.noticeId === "string") ids.add(item.noticeId);
        }
      }
    }
    return ids;
  }
}

function cronDedupeKey(...parts: Array<string | number>): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("base64url");
  return `cron:${digest}`;
}

function asObject(
  value: Prisma.JsonValue | null,
): Record<string, Prisma.JsonValue> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}
