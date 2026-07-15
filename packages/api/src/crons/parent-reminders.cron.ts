import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  addDateDays,
  formatFallbackDate,
  parseDateOnly,
  tashkentDate,
  tashkentInstant,
  TASHKENT_TIME_ZONE,
} from "./cron-date";
import { CronNotificationsService } from "./cron-notifications.service";
import { CronRunnerService, type CronRunResult } from "./cron-runner.service";
import { CRON_JOB_BY_NAME } from "./cron-registry";
import { scheduledEventsForDate } from "./cron-events";

type EventItem = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  locationText: string | null;
};

@Injectable()
export class ParentRemindersCron {
  private readonly logger = new Logger(ParentRemindersCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runs: CronRunnerService,
    private readonly cronNotifications: CronNotificationsService,
  ) {}

  @Cron(CRON_JOB_BY_NAME.get("parent.tomorrow_events")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  tomorrowEvents() {
    return this.runTomorrowEvents(tashkentDate());
  }

  @Cron(CRON_JOB_BY_NAME.get("parent.document_deadline")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  documentDeadlines() {
    return this.runDocumentDeadlines(tashkentDate());
  }

  @Cron(CRON_JOB_BY_NAME.get("parent.notice_nudge")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  noticeNudges() {
    return this.runNoticeNudges(tashkentDate());
  }

  runTomorrowEvents(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("parent.tomorrow_events", date, manual, () =>
      this.sendTomorrowEvents(date),
    );
  }

  runDocumentDeadlines(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("parent.document_deadline", date, manual, () =>
      this.sendDocumentDeadlines(date),
    );
  }

  runNoticeNudges(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("parent.notice_nudge", date, manual, () =>
      this.sendNoticeNudges(date),
    );
  }

  private async sendTomorrowEvents(date: string): Promise<number> {
    const tomorrow = addDateDays(date, 1);
    const events = await scheduledEventsForDate(this.prisma, tomorrow);
    if (events.length === 0) return 0;

    const centerIds = [...new Set(events.map((event) => event.centerId))];
    const enrollments = await this.prisma.childEnrollment.findMany({
      where: {
        centerId: { in: centerIds },
        enrollmentStatus: "active",
        child: { status: "active" },
      },
      select: { centerId: true, childId: true, classId: true },
    });
    const childIdsByEvent = new Map<string, Set<string>>();
    for (const event of events) {
      const explicitChildren = new Set(
        event.children.map((item) => item.childId),
      );
      const classIds = new Set(event.classes.map((item) => item.classId));
      childIdsByEvent.set(
        event.id,
        new Set(
          event.audienceType === "child"
            ? explicitChildren
            : enrollments
                .filter(
                  (item) =>
                    item.centerId === event.centerId &&
                    (event.audienceType === "center" ||
                      (item.classId !== null && classIds.has(item.classId))),
                )
                .map((item) => item.childId),
        ),
      );
    }
    const allChildIds = [
      ...new Set([...childIdsByEvent.values()].flatMap((set) => [...set])),
    ];
    const guardians = await this.prisma.childGuardian.findMany({
      where: { childId: { in: allChildIds } },
      select: { childId: true, userId: true },
    });

    const byUser = new Map<string, Map<string, EventItem>>();
    for (const guardian of guardians) {
      for (const event of events) {
        if (!childIdsByEvent.get(event.id)?.has(guardian.childId)) continue;
        const userEvents =
          byUser.get(guardian.userId) ?? new Map<string, EventItem>();
        userEvents.set(event.id, {
          eventId: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt?.toISOString() ?? null,
          allDay: event.allDay,
          locationText: event.locationText,
        });
        byUser.set(guardian.userId, userEvents);
      }
    }

    let sent = 0;
    for (const [userId, eventMap] of byUser) {
      try {
        const items = [...eventMap.values()];
        const created = await this.cronNotifications.enqueueOnceForDay(
          {
            userId,
            notificationType: "digest.tomorrow_events",
            title: "Tomorrow's events",
            body: `${items.length} event${items.length === 1 ? "" : "s"} tomorrow — ${formatFallbackDate(tomorrow)}`,
            entityType: items.length === 1 ? "calendar_event" : null,
            entityId: items.length === 1 ? items[0]!.eventId : null,
            metadata: items as Prisma.InputJsonArray,
            channels: ["in_app", "push"],
          },
          tomorrow,
          false,
        );
        if (created) sent += 1;
      } catch (error) {
        this.logger.error(
          `Tomorrow events failed for user ${userId}: ${errorText(error)}`,
        );
      }
    }
    return sent;
  }

  private async sendDocumentDeadlines(date: string): Promise<number> {
    const dueDates = [
      { dueDate: addDateDays(date, 3), daysLeft: 3 },
      { dueDate: addDateDays(date, 1), daysLeft: 1 },
    ];
    let sent = 0;
    for (const due of dueDates) {
      const requests = await this.prisma.studentDocumentRequest.findMany({
        where: { status: "sent", dueDate: parseDateOnly(due.dueDate) },
        include: { classes: true, children: true, submissions: true },
      });
      for (const request of requests) {
        const enrollments = await this.prisma.childEnrollment.findMany({
          where: {
            centerId: request.centerId,
            enrollmentStatus: "active",
            child: { status: "active" },
            ...(request.targetType === "child"
              ? {
                  childId: { in: request.children.map((item) => item.childId) },
                }
              : request.targetType === "class"
                ? {
                    classId: {
                      in: request.classes.map((item) => item.classId),
                    },
                  }
                : {}),
          },
          select: { childId: true },
        });
        const pendingChildIds = enrollments
          .map((item) => item.childId)
          .filter((childId) => {
            const submission = request.submissions.find(
              (item) => item.childId === childId,
            );
            return (
              !submission ||
              ["not_started", "draft", "needs_correction"].includes(
                submission.status,
              )
            );
          });
        const guardians = await this.prisma.childGuardian.findMany({
          where: { childId: { in: pendingChildIds } },
          select: { childId: true, userId: true },
        });
        for (const guardian of guardians) {
          try {
            const metadata = {
              requestId: request.id,
              childId: guardian.childId,
              title: request.title,
              dueDate: due.dueDate,
              daysLeft: due.daysLeft,
            } satisfies Prisma.InputJsonObject;
            const created =
              await this.cronNotifications.enqueueDocumentReminderOnce(
                {
                  userId: guardian.userId,
                  notificationType: "document.deadline_reminder",
                  title: "Document deadline reminder",
                  body: `“${request.title}” is due in ${due.daysLeft} day${due.daysLeft === 1 ? "" : "s"}.`,
                  entityType: "student_document",
                  entityId: request.id,
                  metadata,
                  channels: ["in_app", "push"],
                },
                request.id,
                guardian.childId,
                due.daysLeft,
              );
            if (created) sent += 1;
          } catch (error) {
            this.logger.error(
              `Document reminder failed for ${request.id}/${guardian.childId}: ${errorText(error)}`,
            );
          }
        }
      }
    }
    return sent;
  }

  private async sendNoticeNudges(date: string): Promise<number> {
    const runAt = tashkentInstant(date, 19, 30);
    const olderThan = new Date(runAt.getTime() - 24 * 60 * 60 * 1000);
    const newerThan = new Date(runAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recipients = await this.prisma.noticeRecipient.findMany({
      where: {
        notice: {
          status: "published",
          publishedAt: { gt: newerThan, lte: olderThan },
          OR: [{ isImportant: true }, { requiresConfirmation: true }],
        },
        OR: [
          { readAt: null },
          { notice: { requiresConfirmation: true }, confirmedAt: null },
        ],
      },
      include: { notice: true },
      orderBy: { notice: { publishedAt: "asc" } },
    });
    const byUser = new Map<string, typeof recipients>();
    for (const recipient of recipients) {
      const list = byUser.get(recipient.userId) ?? [];
      if (!list.some((item) => item.noticeId === recipient.noticeId))
        list.push(recipient);
      byUser.set(recipient.userId, list);
    }

    let sent = 0;
    for (const [userId, rows] of byUser) {
      try {
        const nudged =
          await this.cronNotifications.previouslyNudgedNoticeIds(userId);
        const pending = rows.filter((row) => !nudged.has(row.noticeId));
        if (pending.length === 0) continue;
        const metadata = pending.map((row) => ({
          noticeId: row.noticeId,
          title: row.notice.title,
          requiresConfirmation: row.notice.requiresConfirmation,
        }));
        // A bundle is itself the permanent record for every notice id in metadata.
        const created = await this.cronNotifications.enqueueOnceForDay(
          {
            userId,
            notificationType: "notice.unread_nudge",
            title: "Unread important notice",
            body:
              pending.length === 1
                ? pending[0]!.notice.title
                : `${pending.length} important notices need your attention.`,
            entityType: pending.length === 1 ? "notice" : null,
            entityId: pending.length === 1 ? pending[0]!.noticeId : null,
            metadata: metadata as Prisma.InputJsonArray,
            channels: ["in_app", "push"],
          },
          date,
          false,
        );
        if (created) sent += 1;
      } catch (error) {
        this.logger.error(
          `Notice nudge failed for user ${userId}: ${errorText(error)}`,
        );
      }
    }
    return sent;
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
