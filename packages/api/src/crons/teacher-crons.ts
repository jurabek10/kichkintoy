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
import { CRON_JOB_BY_NAME } from "./cron-registry";
import { CronRunnerService, type CronRunResult } from "./cron-runner.service";
import { scheduledEventsForDate } from "./cron-events";

const PRESENT_STATUSES = ["present", "late", "left_early", "picked_up"];
const STILL_AT_CENTER_STATUSES = ["present", "late"];
// Excused is an absence with a reason, not an unmarked child.
const ABSENT_STATUSES = ["absent", "excused"];

type Assignment = {
  teacherUserId: string;
  classId: string;
  class: { id: string; name: string; centerId: string };
};

@Injectable()
export class TeacherCrons {
  private readonly logger = new Logger(TeacherCrons.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runs: CronRunnerService,
    private readonly notifications: CronNotificationsService,
  ) {}

  @Cron(CRON_JOB_BY_NAME.get("teacher.attendance_summary")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  attendanceSummary() {
    return this.runAttendanceSummary(tashkentDate());
  }

  @Cron(CRON_JOB_BY_NAME.get("teacher.medications_today")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  medicationsToday() {
    return this.runMedicationsToday(tashkentDate());
  }

  @Cron(CRON_JOB_BY_NAME.get("teacher.end_of_day")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  endOfDay() {
    return this.runEndOfDay(tashkentDate());
  }

  @Cron(CRON_JOB_BY_NAME.get("teacher.tomorrow_reminder")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  tomorrowReminder() {
    return this.runTomorrowReminder(tashkentDate());
  }

  @Cron(CRON_JOB_BY_NAME.get("teacher.notice_reminder")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  noticeReminder() {
    return this.runNoticeReminder(tashkentDate());
  }

  runAttendanceSummary(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("teacher.attendance_summary", date, manual, () =>
      this.sendAttendanceSummary(date),
    );
  }

  runMedicationsToday(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("teacher.medications_today", date, manual, () =>
      this.sendMedicationsToday(date),
    );
  }

  runEndOfDay(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("teacher.end_of_day", date, manual, () =>
      this.sendEndOfDay(date),
    );
  }

  runTomorrowReminder(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("teacher.tomorrow_reminder", date, manual, () =>
      this.sendTomorrowReminder(date),
    );
  }

  runNoticeReminder(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("teacher.notice_reminder", date, manual, () =>
      this.sendNoticeReminder(date),
    );
  }

  private async activeAssignments(date: string): Promise<Assignment[]> {
    const day = parseDateOnly(date);
    return this.prisma.teacherClassAssignment.findMany({
      where: {
        startedAt: { lte: day },
        OR: [{ endedAt: null }, { endedAt: { gte: day } }],
        teacherUser: { status: "active" },
        class: { status: "active" },
      },
      select: {
        teacherUserId: true,
        classId: true,
        class: { select: { id: true, name: true, centerId: true } },
      },
    });
  }

  private async sendAttendanceSummary(date: string): Promise<number> {
    const byTeacher = groupAssignments(await this.activeAssignments(date));
    let sent = 0;
    for (const [teacherUserId, assignments] of byTeacher) {
      try {
        const classIds = assignments.map((item) => item.classId);
        const [enrollments, records] = await Promise.all([
          this.prisma.childEnrollment.findMany({
            where: activeEnrollmentWhere(classIds, date),
            select: {
              classId: true,
              childId: true,
              child: { select: { firstName: true } },
            },
          }),
          this.prisma.attendanceRecord.findMany({
            where: {
              classId: { in: classIds },
              attendanceDate: parseDateOnly(date),
            },
            select: {
              classId: true,
              childId: true,
              status: true,
              absenceReason: true,
              child: { select: { firstName: true } },
            },
          }),
        ]);
        const rows = assignments.map((assignment) => {
          const children = enrollments.filter(
            (item) => item.classId === assignment.classId,
          );
          const childIds = new Set(children.map((item) => item.childId));
          const attendance = records.filter(
            (item) =>
              item.classId === assignment.classId && childIds.has(item.childId),
          );
          const presentCount = attendance.filter((item) =>
            PRESENT_STATUSES.includes(item.status),
          ).length;
          const absences = attendance
            .filter((item) => ABSENT_STATUSES.includes(item.status))
            .map((item) => ({
              childFirstName: item.child.firstName,
              reason: item.absenceReason,
            }));
          return {
            classId: assignment.classId,
            className: assignment.class.name,
            total: children.length,
            presentCount,
            notMarkedCount: Math.max(
              0,
              children.length - presentCount - absences.length,
            ),
            absences,
          };
        });
        const created = await this.notifications.enqueueOnceForDay(
          {
            userId: teacherUserId,
            notificationType: "teacher.attendance_summary",
            title: "Morning attendance summary",
            body: `Attendance summary — ${formatFallbackDate(date)}`,
            entityType: rows.length === 1 ? "class" : null,
            entityId: rows.length === 1 ? rows[0]!.classId : null,
            metadata: rows as Prisma.InputJsonArray,
            channels: ["in_app", "push"],
          },
          date,
          false,
        );
        if (created) sent += 1;
      } catch (error) {
        this.logFailure("attendance summary", teacherUserId, error);
      }
    }
    return sent;
  }

  private async sendMedicationsToday(date: string): Promise<number> {
    const byTeacher = groupAssignments(await this.activeAssignments(date));
    let sent = 0;
    for (const [teacherUserId, assignments] of byTeacher) {
      try {
        const classIds = assignments.map((item) => item.classId);
        const requests = await this.prisma.medicationRequest.findMany({
          where: {
            requestedForDate: parseDateOnly(date),
            status: "pending",
            OR: [
              { classId: { in: classIds } },
              {
                classId: null,
                child: {
                  childEnrollments: {
                    some: activeEnrollmentWhere(classIds, date),
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            medicineName: true,
            dosage: true,
            medicationTime: true,
            child: { select: { firstName: true } },
          },
          orderBy: { createdAt: "asc" },
        });
        if (requests.length === 0) continue;
        const metadata = requests.map((request) => ({
          requestId: request.id,
          childFirstName: request.child.firstName,
          medicineName: request.medicineName,
          dosage: request.dosage,
          medicationTime: request.medicationTime,
        }));
        const created = await this.notifications.enqueueOnceForDay(
          {
            userId: teacherUserId,
            notificationType: "teacher.medications_today",
            title: "Today's medications",
            body: `${requests.length} pending medication request${requests.length === 1 ? "" : "s"}.`,
            entityType: requests.length === 1 ? "medication_request" : null,
            entityId: requests.length === 1 ? requests[0]!.id : null,
            metadata: metadata as Prisma.InputJsonArray,
            channels: ["in_app", "push"],
          },
          date,
          false,
        );
        if (created) sent += 1;
      } catch (error) {
        this.logFailure("medications", teacherUserId, error);
      }
    }
    return sent;
  }

  private async sendEndOfDay(date: string): Promise<number> {
    const byTeacher = groupAssignments(await this.activeAssignments(date));
    const cutoff = new Date(
      tashkentInstant(date, 17, 30).getTime() - 24 * 60 * 60 * 1000,
    );
    let sent = 0;
    for (const [teacherUserId, assignments] of byTeacher) {
      try {
        const classIds = assignments.map((item) => item.classId);
        const enrollments = await this.prisma.childEnrollment.findMany({
          where: activeEnrollmentWhere(classIds, date),
          select: { childId: true, classId: true },
        });
        const childIds = [...new Set(enrollments.map((item) => item.childId))];
        const [
          present,
          openCheckouts,
          meals,
          reports,
          submissions,
          guardians,
          reportComments,
          noticeComments,
          conversations,
        ] = await Promise.all([
          this.prisma.attendanceRecord.findMany({
            where: {
              classId: { in: classIds },
              attendanceDate: parseDateOnly(date),
              status: { in: PRESENT_STATUSES },
            },
            select: { childId: true },
          }),
          this.prisma.attendanceRecord.count({
            where: {
              classId: { in: classIds },
              attendanceDate: parseDateOnly(date),
              status: { in: STILL_AT_CENTER_STATUSES },
              checkOutAt: null,
            },
          }),
          this.prisma.mealPost.findMany({
            where: {
              mealDate: parseDateOnly(date),
              status: "published",
              deletedAt: null,
              OR: [
                { classes: { some: { classId: { in: classIds } } } },
                {
                  audienceType: "center",
                  centerId: {
                    in: assignments.map((item) => item.class.centerId),
                  },
                },
              ],
            },
            select: {
              id: true,
              centerId: true,
              classes: { select: { classId: true } },
              childStatuses: {
                where: { childId: { in: childIds } },
                select: { childId: true },
              },
            },
          }),
          this.prisma.dailyReport.findMany({
            where: {
              classId: { in: classIds },
              childId: { in: childIds },
              reportDate: parseDateOnly(date),
              status: "published",
            },
            select: { childId: true },
          }),
          this.prisma.studentDocumentSubmission.count({
            where: { childId: { in: childIds }, status: "submitted" },
          }),
          this.prisma.childGuardian.findMany({
            where: { childId: { in: childIds } },
            select: { userId: true },
          }),
          this.prisma.dailyReportComment.findMany({
            where: {
              dailyReport: { classId: { in: classIds } },
              deletedAt: null,
            },
            select: {
              dailyReportId: true,
              authorUserId: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          }),
          this.prisma.noticeComment.findMany({
            where: {
              notice: noticeAudienceWhere(assignments),
              deletedAt: null,
            },
            select: { noticeId: true, authorUserId: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          }),
          this.prisma.conversationThread.findMany({
            where: {
              // Direct parent/teacher threads are center-scoped and normally
              // have no classId. The guardian check below narrows them back to
              // parents of children in this teacher's assigned classes.
              centerId: {
                in: [
                  ...new Set(assignments.map((item) => item.class.centerId)),
                ],
              },
              threadType: "direct",
              lastMessageAt: { lte: cutoff },
              participants: { some: { userId: teacherUserId } },
            },
            select: {
              id: true,
              lastMessageAt: true,
              participants: {
                where: { userId: teacherUserId },
                select: { lastReadAt: true },
              },
              messages: {
                where: { deletedAt: null },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { senderUserId: true, createdAt: true },
              },
            },
          }),
        ]);
        const presentIds = new Set(present.map((item) => item.childId));
        const reportedIds = new Set(reports.map((item) => item.childId));
        let missingMealStatuses = 0;
        for (const meal of meals) {
          const mealClassIds = new Set(
            meal.classes.length > 0
              ? meal.classes.map((item) => item.classId)
              : assignments
                  .filter((item) => item.class.centerId === meal.centerId)
                  .map((item) => item.classId),
          );
          const eligibleIds = new Set(
            enrollments
              .filter(
                (item) =>
                  item.classId !== null && mealClassIds.has(item.classId),
              )
              .map((item) => item.childId),
          );
          const marked = new Set(
            meal.childStatuses.map((item) => item.childId),
          );
          missingMealStatuses += [...presentIds].filter(
            (id) => eligibleIds.has(id) && !marked.has(id),
          ).length;
        }
        const guardianIds = new Set(guardians.map((item) => item.userId));
        const unansweredComments =
          countParentLast(
            reportComments,
            "dailyReportId",
            guardianIds,
            cutoff,
          ) + countParentLast(noticeComments, "noticeId", guardianIds, cutoff);
        const unansweredConversations = conversations.filter((thread) => {
          const message = thread.messages[0];
          const lastReadAt = thread.participants[0]?.lastReadAt;
          return Boolean(
            message &&
            guardianIds.has(message.senderUserId) &&
            (!lastReadAt || lastReadAt < message.createdAt),
          );
        }).length;
        const metadata = {
          missingCheckouts: openCheckouts,
          missingMealStatuses,
          missingReports: [...presentIds].filter((id) => !reportedIds.has(id))
            .length,
          unansweredParents: unansweredComments + unansweredConversations,
          submissionsToReview: submissions,
          classNames: assignments.map((item) => item.class.name),
        } satisfies Prisma.InputJsonObject;
        if (
          Object.entries(metadata).every(
            ([key, value]) => key === "classNames" || value === 0,
          )
        )
          continue;
        const created = await this.notifications.enqueueOnceForDay(
          {
            userId: teacherUserId,
            notificationType: "teacher.end_of_day",
            title: "End-of-day checklist",
            body: "There are items to finish before today's parent summary.",
            entityType: null,
            entityId: null,
            metadata,
            channels: ["in_app", "push"],
          },
          date,
          false,
        );
        if (created) sent += 1;
      } catch (error) {
        this.logFailure("end-of-day checklist", teacherUserId, error);
      }
    }
    return sent;
  }

  private async sendTomorrowReminder(date: string): Promise<number> {
    const assignments = await this.activeAssignments(date);
    const byTeacher = groupAssignments(assignments);
    const tomorrow = addDateDays(date, 1);
    const events = (await scheduledEventsForDate(this.prisma, tomorrow)).filter(
      (event) => ["center", "class"].includes(event.audienceType),
    );
    let sent = 0;
    for (const [teacherUserId, teacherAssignments] of byTeacher) {
      try {
        const classIds = new Set(
          teacherAssignments.map((item) => item.classId),
        );
        const centerIds = new Set(
          teacherAssignments.map((item) => item.class.centerId),
        );
        const teacherEvents = events.filter(
          (event) =>
            centerIds.has(event.centerId) &&
            (event.audienceType === "center" ||
              event.classes.some((item) => classIds.has(item.classId))),
        );
        const children = await this.prisma.childEnrollment.findMany({
          where: activeEnrollmentWhere([...classIds], tomorrow),
          select: {
            child: { select: { id: true, firstName: true, dob: true } },
          },
        });
        const target = parseDateOnly(tomorrow);
        const birthdays = uniqueBy(
          children
            .map((item) => item.child)
            .filter(
              (child) =>
                child.dob.getUTCMonth() === target.getUTCMonth() &&
                child.dob.getUTCDate() === target.getUTCDate(),
            ),
          (item) => item.id,
        ).map((child) => ({
          childId: child.id,
          childFirstName: child.firstName,
        }));
        if (teacherEvents.length === 0 && birthdays.length === 0) continue;
        const eventMetadata = teacherEvents.map((event) => ({
          eventId: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt?.toISOString() ?? null,
          allDay: event.allDay,
          locationText: event.locationText,
        }));
        const metadata = {
          events: eventMetadata,
          birthdays,
        } satisfies Prisma.InputJsonObject;
        const singleEvent =
          teacherEvents.length === 1 && birthdays.length === 0;
        const created = await this.notifications.enqueueOnceForDay(
          {
            userId: teacherUserId,
            notificationType: "teacher.tomorrow_reminder",
            title: "Tomorrow's reminder",
            body: `Tomorrow — ${formatFallbackDate(tomorrow)}`,
            entityType: singleEvent ? "calendar_event" : null,
            entityId: singleEvent ? teacherEvents[0]!.id : null,
            metadata,
            channels: ["in_app", "push"],
          },
          tomorrow,
          false,
        );
        if (created) sent += 1;
      } catch (error) {
        this.logFailure("tomorrow reminder", teacherUserId, error);
      }
    }
    return sent;
  }

  private async sendNoticeReminder(date: string): Promise<number> {
    const assignments = await this.activeAssignments(date);
    const byTeacher = groupAssignments(assignments);
    const runAt = tashkentInstant(date, 19, 30);
    const olderThan = new Date(runAt.getTime() - 24 * 60 * 60 * 1000);
    const newerThan = new Date(runAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    let sent = 0;
    for (const [teacherUserId, teacherAssignments] of byTeacher) {
      try {
        const notices = await this.prisma.notice.findMany({
          where: {
            status: "published",
            publishedAt: { gt: newerThan, lte: olderThan },
            authorUserId: { not: teacherUserId },
            OR: [{ isImportant: true }, { requiresConfirmation: true }],
            AND: [noticeAudienceWhere(teacherAssignments)],
          },
          select: { id: true, title: true, requiresConfirmation: true },
          orderBy: { publishedAt: "asc" },
        });
        const nudged = await this.notifications.previouslyNudgedNoticeIds(
          teacherUserId,
          "teacher.notice_reminder",
        );
        const pending = notices.filter((notice) => !nudged.has(notice.id));
        if (pending.length === 0) continue;
        const metadata = pending.map((notice) => ({
          noticeId: notice.id,
          title: notice.title,
          requiresConfirmation: notice.requiresConfirmation,
        }));
        const created = await this.notifications.enqueueOnceForDay(
          {
            userId: teacherUserId,
            notificationType: "teacher.notice_reminder",
            title: "Important notice reminder",
            body:
              pending.length === 1
                ? pending[0]!.title
                : `${pending.length} important notices.`,
            entityType: pending.length === 1 ? "notice" : null,
            entityId: pending.length === 1 ? pending[0]!.id : null,
            metadata: metadata as Prisma.InputJsonArray,
            channels: ["in_app", "push"],
          },
          date,
          false,
        );
        if (created) sent += 1;
      } catch (error) {
        this.logFailure("notice reminder", teacherUserId, error);
      }
    }
    return sent;
  }

  private logFailure(job: string, userId: string, error: unknown) {
    this.logger.error(
      `Teacher ${job} failed for ${userId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function groupAssignments(rows: Assignment[]): Map<string, Assignment[]> {
  const result = new Map<string, Assignment[]>();
  for (const row of rows) {
    const current = result.get(row.teacherUserId) ?? [];
    if (!current.some((item) => item.classId === row.classId))
      current.push(row);
    result.set(row.teacherUserId, current);
  }
  return result;
}

function activeEnrollmentWhere(
  classIds: string[],
  date: string,
): Prisma.ChildEnrollmentWhereInput {
  const day = parseDateOnly(date);
  return {
    classId: { in: classIds },
    enrollmentStatus: "active",
    startedAt: { lte: day },
    OR: [{ endedAt: null }, { endedAt: { gte: day } }],
    child: { status: "active" },
  };
}

function noticeAudienceWhere(
  assignments: Assignment[],
): Prisma.NoticeWhereInput {
  const classIds = assignments.map((item) => item.classId);
  const centerIds = [
    ...new Set(assignments.map((item) => item.class.centerId)),
  ];
  return {
    centerId: { in: centerIds },
    OR: [
      { targetType: "center" },
      {
        targetType: "class",
        targets: { some: { targetKind: "class", targetId: { in: classIds } } },
      },
    ],
  };
}

function countParentLast<T extends { authorUserId: string; createdAt: Date }>(
  rows: T[],
  key: keyof T,
  guardianIds: Set<string>,
  cutoff: Date,
): number {
  const last = new Map<unknown, T>();
  for (const row of rows) last.set(row[key], row);
  return [...last.values()].filter(
    (row) => guardianIds.has(row.authorUserId) && row.createdAt <= cutoff,
  ).length;
}

function uniqueBy<T>(rows: T[], key: (row: T) => string): T[] {
  return [...new Map(rows.map((row) => [key(row), row])).values()];
}
