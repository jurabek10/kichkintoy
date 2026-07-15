import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  addDateDays,
  dateOnlyRange,
  formatFallbackDate,
  parseDateOnly,
  tashkentDate,
  TASHKENT_TIME_ZONE,
} from "./cron-date";
import { CronNotificationsService } from "./cron-notifications.service";
import { CronRunnerService, type CronRunResult } from "./cron-runner.service";
import { CRON_JOB_BY_NAME } from "./cron-registry";

// Check-out flips attendance to picked_up/left_early, so those still count as
// an attended day; see markAttendanceStatusValues in @kichkintoy/shared.
const PRESENT_STATUSES = ["present", "late", "left_early", "picked_up"];
const SLEEP_MINUTES: Record<string, number> = {
  well_2h: 120,
  well_1h30: 90,
  well_1h: 60,
  briefly: 30,
  no_sleep: 0,
  // Legacy free-text values recorded before sleep tokens existed.
  "slept well (2 hours)": 120,
  "slept well (1.5 hours)": 90,
  "slept well (1 hour)": 60,
  "slept briefly (30 min)": 30,
  "didn't sleep": 0,
};
// Restless sleep has no recorded duration; the digest reports it qualitatively.
const RESTLESS_SLEEP_VALUES = new Set(["restless", "restless sleep"]);

@Injectable()
export class ParentDigestCron {
  private readonly logger = new Logger(ParentDigestCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runs: CronRunnerService,
    private readonly cronNotifications: CronNotificationsService,
  ) {}

  @Cron(CRON_JOB_BY_NAME.get("parent.daily_digest")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  dailyDigest() {
    return this.runDailyDigest(tashkentDate());
  }

  @Cron(CRON_JOB_BY_NAME.get("parent.weekly_recap")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  weeklyRecap() {
    return this.runWeeklyRecap(tashkentDate());
  }

  runDailyDigest(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("parent.daily_digest", date, manual, () =>
      this.sendDailyDigests(date),
    );
  }

  runWeeklyRecap(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("parent.weekly_recap", date, manual, () =>
      this.sendWeeklyRecaps(date),
    );
  }

  private async sendDailyDigests(date: string): Promise<number> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        attendanceDate: parseDateOnly(date),
        status: { in: PRESENT_STATUSES },
        child: {
          status: "active",
          childEnrollments: { some: { enrollmentStatus: "active" } },
        },
      },
      include: {
        child: {
          include: {
            childGuardians: { select: { userId: true } },
          },
        },
      },
    });

    let sent = 0;
    for (const record of records) {
      try {
        const [meals, report, schedules] = await Promise.all([
          this.prisma.mealPost.findMany({
            where: {
              mealDate: parseDateOnly(date),
              status: "published",
              deletedAt: null,
              OR: [
                { audienceType: "center", centerId: record.centerId },
                { classes: { some: { classId: record.classId } } },
              ],
            },
            include: {
              childStatuses: { where: { childId: record.childId } },
            },
            orderBy: { publishedAt: "asc" },
          }),
          this.prisma.dailyReport.findFirst({
            where: {
              childId: record.childId,
              reportDate: parseDateOnly(date),
              status: "published",
            },
            include: {
              items: { where: { itemType: { in: ["sleep", "activity"] } } },
            },
          }),
          this.prisma.schedule.findMany({
            where: {
              classId: record.classId,
              startsAt: { lt: dayEnd(date) },
              OR: [{ endsAt: null }, { endsAt: { gte: dayStart(date) } }],
            },
            select: { title: true },
            orderBy: { startsAt: "asc" },
          }),
        ]);

        const sleepItems = (report?.items ?? []).filter(
          (item) => item.itemType === "sleep",
        );
        const sleepMinutes = sleepItems.reduce(
          (sum, item) => sum + sleepValueMinutes(item.value),
          0,
        );
        const sleepRestless = sleepItems.some(
          (item) =>
            item.value !== null &&
            RESTLESS_SLEEP_VALUES.has(item.value.trim().toLowerCase()),
        );
        const activities = unique([
          ...schedules.map((item) => item.title),
          ...(report?.items ?? [])
            .filter((item) => item.itemType === "activity")
            .map((item) => item.title || item.value)
            .filter((value): value is string => Boolean(value)),
        ]).map((title) => ({ title }));

        const metadata = {
          childId: record.childId,
          childFirstName: record.child.firstName,
          date,
          checkInAt: record.checkInAt?.toISOString() ?? null,
          checkOutAt: record.checkOutAt?.toISOString() ?? null,
          pickedUpBy: record.pickedUpBy,
          pickedUpRelationship: record.pickedUpRelationship,
          meals: meals.map((meal) => ({
            mealType: meal.mealType,
            menuText: meal.menuText,
            eatingStatus: meal.childStatuses[0]?.status ?? null,
          })),
          sleepMinutes,
          sleepRestless,
          activities,
        } satisfies Prisma.InputJsonObject;

        for (const guardian of record.child.childGuardians) {
          const created = await this.cronNotifications.enqueueOnceForDay(
            {
              userId: guardian.userId,
              notificationType: "digest.daily",
              title: "Daily summary",
              body: `Summary for ${record.child.firstName} — ${formatFallbackDate(date)}`,
              entityType: "child",
              entityId: record.childId,
              metadata,
              channels: ["in_app", "push"],
            },
            date,
          );
          if (created) sent += 1;
        }
      } catch (error) {
        this.logger.error(
          `Daily digest failed for child ${record.childId}: ${errorText(error)}`,
        );
      }
    }
    return sent;
  }

  private async sendWeeklyRecaps(date: string): Promise<number> {
    const weekday = parseDateOnly(date).getUTCDay();
    const weekStart = addDateDays(date, weekday === 0 ? -6 : 1 - weekday);
    const weekEnd = addDateDays(weekStart, 5);
    const endExclusive = addDateDays(weekEnd, 1);
    const enrollments = await this.prisma.childEnrollment.findMany({
      where: { enrollmentStatus: "active", child: { status: "active" } },
      include: {
        child: { include: { childGuardians: { select: { userId: true } } } },
      },
    });

    let sent = 0;
    const seen = new Set<string>();
    for (const enrollment of enrollments) {
      const key = `${enrollment.childId}:${enrollment.centerId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        const [attendance, operatingDates, photoCount, reportCount] =
          await Promise.all([
            this.prisma.attendanceRecord.findMany({
              where: {
                childId: enrollment.childId,
                attendanceDate: dateOnlyRange(weekStart, endExclusive),
                status: { in: PRESENT_STATUSES },
              },
              select: { attendanceDate: true },
            }),
            this.prisma.attendanceRecord.findMany({
              where: {
                centerId: enrollment.centerId,
                attendanceDate: dateOnlyRange(weekStart, endExclusive),
              },
              select: { attendanceDate: true },
              distinct: ["attendanceDate"],
            }),
            this.prisma.albumMedia.count({
              where: {
                createdAt: {
                  gte: dayStart(weekStart),
                  lt: dayStart(endExclusive),
                },
                post: { status: "published", deletedAt: null },
                children: { some: { childId: enrollment.childId } },
              },
            }),
            this.prisma.dailyReport.count({
              where: {
                childId: enrollment.childId,
                status: "published",
                publishedAt: {
                  gte: dayStart(weekStart),
                  lt: dayStart(endExclusive),
                },
              },
            }),
          ]);
        const attendedDays = new Set(
          attendance.map((item) =>
            item.attendanceDate.toISOString().slice(0, 10),
          ),
        ).size;
        const operatingDays = operatingDates.length;

        for (const guardian of enrollment.child.childGuardians) {
          const noticeCount = await this.prisma.noticeRecipient.count({
            where: {
              userId: guardian.userId,
              childId: enrollment.childId,
              createdAt: {
                gte: dayStart(weekStart),
                lt: dayStart(endExclusive),
              },
              notice: { status: "published" },
            },
          });
          if (
            attendedDays === 0 &&
            photoCount === 0 &&
            reportCount === 0 &&
            noticeCount === 0
          )
            continue;
          const created = await this.cronNotifications.enqueueWeeklyRecapOnce(
            {
              userId: guardian.userId,
              notificationType: "digest.weekly",
              title: "Weekly recap",
              body: `Weekly recap for ${enrollment.child.firstName}`,
              entityType: "child",
              entityId: enrollment.childId,
              metadata: {
                childId: enrollment.childId,
                childFirstName: enrollment.child.firstName,
                weekStart,
                weekEnd,
                attendedDays,
                operatingDays,
                photoCount,
                reportCount,
                noticeCount,
              },
              channels: ["in_app", "push"],
            },
            enrollment.childId,
            weekStart,
          );
          if (created) sent += 1;
        }
      } catch (error) {
        this.logger.error(
          `Weekly recap failed for child ${enrollment.childId}: ${errorText(error)}`,
        );
      }
    }
    return sent;
  }
}

function sleepValueMinutes(value: string | null): number {
  if (!value) return 0;
  const key = value.trim().toLowerCase();
  if (key in SLEEP_MINUTES) return SLEEP_MINUTES[key]!;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : 0;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function dayStart(date: string): Date {
  const day = parseDateOnly(date);
  return new Date(day.getTime() - 5 * 60 * 60 * 1000);
}

function dayEnd(date: string): Date {
  return dayStart(addDateDays(date, 1));
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
