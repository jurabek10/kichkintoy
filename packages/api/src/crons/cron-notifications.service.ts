import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  NotificationsService,
  type EnqueueNotificationInput,
} from "../notifications/notifications.service";

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
    return this.enqueueWithKey(input, [
      input.notificationType,
      input.userId,
      entityScoped ? (input.entityId ?? "none") : "all",
      date,
    ]);
  }

  async enqueueDocumentReminderOnce(
    input: EnqueueNotificationInput,
    requestId: string,
    childId: string,
    daysLeft: number,
  ): Promise<boolean> {
    return this.enqueueWithKey(input, [
      input.notificationType,
      input.userId,
      requestId,
      childId,
      daysLeft,
    ]);
  }

  async enqueueWeeklyRecapOnce(
    input: EnqueueNotificationInput,
    childId: string,
    weekStart: string,
  ): Promise<boolean> {
    return this.enqueueWithKey(input, [
      input.notificationType,
      input.userId,
      childId,
      weekStart,
    ]);
  }

  async previouslyNudgedNoticeIds(
    userId: string,
    notificationType = "notice.unread_nudge",
  ): Promise<Set<string>> {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        notificationType,
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

  private async enqueueWithKey(
    input: EnqueueNotificationInput,
    keyParts: Array<string | number>,
  ): Promise<boolean> {
    const dedupeKey = cronDedupeKey(...keyParts);
    const existing = await this.prisma.notification.findFirst({
      where: { dedupeKey },
      select: { id: true },
    });
    if (existing) return false;
    const rows = await this.notifications.enqueue({ ...input, dedupeKey });
    return rows.length > 0;
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
