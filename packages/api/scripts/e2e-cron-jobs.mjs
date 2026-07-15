import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { CronNotificationsService } from "../dist/crons/cron-notifications.service.js";
import { CronRunnerService } from "../dist/crons/cron-runner.service.js";
import { ParentDigestCron } from "../dist/crons/parent-digest.cron.js";
import { ParentRemindersCron } from "../dist/crons/parent-reminders.cron.js";
import { TuitionReminderCron } from "../dist/crons/tuition-reminder.cron.js";
import { TeacherCrons } from "../dist/crons/teacher-crons.js";
import { NotificationsService } from "../dist/notifications/notifications.service.js";
import { InvoiceMaterializationService } from "../dist/payments/invoice-materialization.service.js";

const connectionString = process.env.CRON_E2E_DATABASE_URL;
const databaseName = connectionString
  ? new URL(connectionString).pathname.slice(1)
  : "";
if (!connectionString || databaseName === "kichkintoy") {
  throw new Error(
    "CRON_E2E_DATABASE_URL must point to a disposable test database.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const realtime = { publishNotification: async () => undefined };
const notifications = new NotificationsService(prisma, {}, realtime);
const cronNotifications = new CronNotificationsService(prisma, notifications);
const runs = new CronRunnerService(prisma);
const invoices = new InvoiceMaterializationService(prisma);
const digests = new ParentDigestCron(prisma, runs, cronNotifications);
const reminders = new ParentRemindersCron(prisma, runs, cronNotifications);
const tuition = new TuitionReminderCron(invoices, runs, cronNotifications);
const teacherCrons = new TeacherCrons(prisma, runs, cronNotifications);

const day = (value) => new Date(`${value}T00:00:00.000Z`);
const instant = (value) => new Date(value);

try {
  const fixture = await seedFixture();
  const results = {};

  results.daily = await digests.runDailyDigest("2040-07-14", true);
  assert.equal(results.daily.sentCount, 1);
  assert.equal((await digests.runDailyDigest("2040-07-14", true)).sentCount, 0);
  const dailyRow = await prisma.notification.findFirst({
    where: {
      userId: fixture.parent.id,
      notificationType: "digest.daily",
      channel: "in_app",
    },
  });
  assert.equal(dailyRow.metadata.sleepMinutes, 90);
  assert.equal(dailyRow.metadata.sleepRestless, true);

  results.events = await reminders.runTomorrowEvents("2040-07-14", true);
  assert.equal(results.events.sentCount, 1);
  assert.equal(
    (await reminders.runTomorrowEvents("2040-07-14", true)).sentCount,
    0,
  );

  results.tuition = await tuition.runTuitionReminders("2040-07-25", true);
  assert.equal(results.tuition.sentCount, 1);
  assert.equal(
    (await tuition.runTuitionReminders("2040-07-25", true)).sentCount,
    0,
  );
  await prisma.invoice.updateMany({
    where: { childId: fixture.child.id },
    data: { status: "paid" },
  });
  assert.equal(
    (await tuition.runTuitionReminders("2040-07-26", true)).sentCount,
    0,
  );

  results.weekly = await digests.runWeeklyRecap("2040-07-15", true);
  assert.equal(results.weekly.sentCount, 1);
  assert.equal((await digests.runWeeklyRecap("2040-07-15", true)).sentCount, 0);

  results.documentsD3 = await reminders.runDocumentDeadlines(
    "2040-07-14",
    true,
  );
  assert.equal(results.documentsD3.sentCount, 1);
  assert.equal(
    (await reminders.runDocumentDeadlines("2040-07-14", true)).sentCount,
    0,
  );
  results.documentsD1 = await reminders.runDocumentDeadlines(
    "2040-07-16",
    true,
  );
  assert.equal(results.documentsD1.sentCount, 1);

  results.notice = await reminders.runNoticeNudges("2040-07-14", true);
  assert.equal(results.notice.sentCount, 1);
  assert.equal(
    (await reminders.runNoticeNudges("2040-07-15", true)).sentCount,
    0,
  );

  const teacherJobs = [
    [
      "teacher.attendance_summary",
      () => teacherCrons.runAttendanceSummary("2040-07-14", true),
    ],
    [
      "teacher.medications_today",
      () => teacherCrons.runMedicationsToday("2040-07-14", true),
    ],
    ["teacher.end_of_day", () => teacherCrons.runEndOfDay("2040-07-14", true)],
    [
      "teacher.tomorrow_reminder",
      () => teacherCrons.runTomorrowReminder("2040-07-14", true),
    ],
    [
      "teacher.notice_reminder",
      () => teacherCrons.runNoticeReminder("2040-07-14", true),
    ],
  ];
  for (const [name, run] of teacherJobs) {
    const expectedFirstCount = name === "teacher.attendance_summary" ? 2 : 1;
    assert.equal(
      (await run()).sentCount,
      expectedFirstCount,
      `${name} first run`,
    );
    assert.deepEqual(
      await prisma.cronJobRun.findUnique({
        where: {
          jobName_runDate: { jobName: name, runDate: day("2040-07-14") },
        },
        select: { status: true, sentCount: true },
      }),
      { status: "succeeded", sentCount: expectedFirstCount },
      `${name} records the first sent count`,
    );
    assert.equal((await run()).sentCount, 0, `${name} deduped rerun`);
    assert.deepEqual(
      await prisma.cronJobRun.findUnique({
        where: {
          jobName_runDate: { jobName: name, runDate: day("2040-07-14") },
        },
        select: { status: true, sentCount: true },
      }),
      { status: "succeeded", sentCount: 0 },
      `${name} updates the same-date run row`,
    );
  }
  assert.equal(
    (await teacherCrons.runNoticeReminder("2040-07-15", true)).sentCount,
    0,
  );

  const teacherRows = await prisma.notification.findMany({
    where: {
      userId: fixture.teacher.id,
      channel: "in_app",
      notificationType: { startsWith: "teacher." },
    },
  });
  assert.equal(teacherRows.length, 5);
  assert.equal(
    await prisma.notification.count({
      where: {
        userId: fixture.clearTeacher.id,
        notificationType: { startsWith: "teacher." },
        channel: "in_app",
      },
    }),
    1,
  );
  const teacherByType = Object.fromEntries(
    teacherRows.map((row) => [row.notificationType, row]),
  );
  assert.equal(teacherByType["teacher.attendance_summary"].metadata.length, 2);
  const secondClassRow = teacherByType[
    "teacher.attendance_summary"
  ].metadata.find((row) => row.className === "Cron E2E Second Class");
  assert.deepEqual(secondClassRow.absences.map((item) => item.reason).sort(), [
    "doctor visit",
    "family reason",
  ]);
  assert.equal(secondClassRow.notMarkedCount, 0);
  assert.equal(teacherByType["teacher.medications_today"].metadata.length, 1);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(teacherByType["teacher.end_of_day"].metadata).filter(
        ([key]) => key !== "classNames",
      ),
    ),
    {
      missingCheckouts: 1,
      missingMealStatuses: 1,
      missingReports: 1,
      unansweredParents: 1,
      submissionsToReview: 1,
    },
  );
  assert.equal(
    teacherByType["teacher.tomorrow_reminder"].metadata.events.length,
    2,
  );
  assert.equal(
    teacherByType["teacher.tomorrow_reminder"].metadata.birthdays.length,
    1,
  );
  assert.equal(teacherByType["teacher.notice_reminder"].metadata.length, 1);
  assert.equal(
    teacherByType["teacher.notice_reminder"].metadata[0].title,
    "Important meeting",
  );
  assert.ok(teacherRows.every((row) => row.dedupeKey?.startsWith("cron:")));
  assert.equal(
    await prisma.notification.count({
      where: {
        userId: fixture.teacher.id,
        channel: "push",
        notificationType: { startsWith: "teacher." },
      },
    }),
    teacherRows.length,
  );

  const teacherRunRows = await prisma.cronJobRun.findMany({
    where: { jobName: { startsWith: "teacher." } },
    orderBy: { startedAt: "asc" },
  });
  for (const [name] of teacherJobs) {
    const jobRuns = teacherRunRows.filter((row) => row.jobName === name);
    assert.equal(
      jobRuns.length,
      name === "teacher.notice_reminder" ? 2 : 1,
      `${name} keeps one row per processing date`,
    );
    assert.ok(jobRuns.every((row) => row.status === "succeeded"));
    assert.ok(jobRuns.every((row) => row.sentCount === 0));
  }

  const inApp = await prisma.notification.findMany({
    where: { userId: fixture.parent.id, channel: "in_app" },
    orderBy: { notificationType: "asc" },
  });
  assert.deepEqual(
    [...new Set(inApp.map((row) => row.notificationType))].sort(),
    [
      "digest.daily",
      "digest.tomorrow_events",
      "digest.weekly",
      "document.deadline_reminder",
      "notice.unread_nudge",
      "payment.reminder",
    ],
  );
  assert.equal(
    inApp.filter((row) => row.notificationType === "digest.tomorrow_events")
      .length,
    1,
  );
  assert.equal(
    inApp.filter((row) => row.notificationType === "document.deadline_reminder")
      .length,
    2,
  );
  assert.ok(inApp.every((row) => row.dedupeKey?.startsWith("cron:")));
  assert.equal(
    await prisma.notification.count({
      where: { userId: fixture.parent.id, channel: "push" },
    }),
    inApp.length,
  );

  const submittedReminder = inApp.find(
    (row) => row.entityId === fixture.submittedRequest.id,
  );
  assert.equal(submittedReminder, undefined);
  assert.equal(
    await prisma.notification.count({
      where: { userId: fixture.parent.id, entityId: fixture.emptyChild.id },
    }),
    0,
  );

  console.log(
    JSON.stringify({
      jobsVerified: 11,
      logicalNotifications: inApp.length,
      deliveryRows: inApp.length * 2,
      historicalRerunsCreated: 0,
      paidInvoiceSkipped: true,
      submittedDocumentSkipped: true,
      emptyWeeklyChildSkipped: true,
      noticeNextDaySkipped: true,
    }),
  );
} finally {
  await prisma.$disconnect();
}

async function seedFixture() {
  const organization = await prisma.organization.create({
    data: { name: "Cron E2E Organization" },
  });
  const center = await prisma.center.create({
    data: {
      organizationId: organization.id,
      name: "Cron E2E Center",
      centerCode: `CRON-E2E-${Date.now()}`,
      monthlyTuitionUzs: 1_250_000,
    },
  });
  const classroom = await prisma.class.create({
    data: { centerId: center.id, name: "Cron E2E Class" },
  });
  const secondClassroom = await prisma.class.create({
    data: { centerId: center.id, name: "Cron E2E Second Class" },
  });
  const clearCenter = await prisma.center.create({
    data: {
      organizationId: organization.id,
      name: "Cron Clear Center",
      centerCode: `CRON-CLEAR-${Date.now()}`,
    },
  });
  const clearClassroom = await prisma.class.create({
    data: { centerId: clearCenter.id, name: "All Clear" },
  });
  const [parent, author, teacher, clearTeacher] = await Promise.all([
    prisma.user.create({
      data: { username: `cron_parent_${Date.now()}`, fullName: "Cron Parent" },
    }),
    prisma.user.create({
      data: { username: `cron_author_${Date.now()}`, fullName: "Cron Author" },
    }),
    prisma.user.create({
      data: {
        username: `cron_teacher_${Date.now()}`,
        fullName: "Cron Teacher",
      },
    }),
    prisma.user.create({
      data: {
        username: `cron_clear_teacher_${Date.now()}`,
        fullName: "Clear Teacher",
      },
    }),
  ]);
  const child = await prisma.child.create({
    data: { firstName: "Aziza", dob: day("2035-07-15") },
  });
  const emptyChild = await prisma.child.create({
    data: { firstName: "Bek", dob: day("2035-05-11") },
  });
  await Promise.all([
    prisma.teacherClassAssignment.create({
      data: {
        teacherUserId: teacher.id,
        classId: classroom.id,
        startedAt: day("2040-01-01"),
      },
    }),
    prisma.teacherClassAssignment.create({
      data: {
        teacherUserId: teacher.id,
        classId: secondClassroom.id,
        startedAt: day("2040-01-01"),
      },
    }),
    prisma.teacherClassAssignment.create({
      data: {
        teacherUserId: clearTeacher.id,
        classId: clearClassroom.id,
        startedAt: day("2040-01-01"),
      },
    }),
    prisma.childGuardian.create({
      data: {
        childId: child.id,
        userId: parent.id,
        relationship: "mother",
        isPrimary: true,
      },
    }),
    prisma.childGuardian.create({
      data: {
        childId: emptyChild.id,
        userId: parent.id,
        relationship: "mother",
        isPrimary: false,
      },
    }),
    prisma.childEnrollment.create({
      data: {
        childId: child.id,
        centerId: center.id,
        classId: classroom.id,
        startedAt: day("2040-01-01"),
      },
    }),
    prisma.childEnrollment.create({
      data: {
        childId: emptyChild.id,
        centerId: center.id,
        classId: classroom.id,
        startedAt: day("2040-01-01"),
      },
    }),
  ]);

  await prisma.attendanceRecord.create({
    data: {
      centerId: center.id,
      classId: classroom.id,
      childId: child.id,
      attendanceDate: day("2040-07-14"),
      // Check-out flips the status to picked_up in the real app; the digest
      // must still treat the day as attended.
      status: "picked_up",
      checkInAt: instant("2040-07-14T03:30:00.000Z"),
      checkOutAt: instant("2040-07-14T12:15:00.000Z"),
      pickedUpBy: "Otabek",
      pickedUpRelationship: "father",
    },
  });
  const workingChild = await prisma.child.create({
    data: { firstName: "Sardor", dob: day("2035-03-01") },
  });
  const absentChild = await prisma.child.create({
    data: { firstName: "Bekzod", dob: day("2035-04-01") },
  });
  const excusedChild = await prisma.child.create({
    data: { firstName: "Dilnoza", dob: day("2035-06-01") },
  });
  await prisma.childEnrollment.createMany({
    data: [
      {
        childId: workingChild.id,
        centerId: center.id,
        classId: classroom.id,
        startedAt: day("2040-01-01"),
      },
      {
        childId: absentChild.id,
        centerId: center.id,
        classId: secondClassroom.id,
        startedAt: day("2040-01-01"),
      },
      {
        childId: excusedChild.id,
        centerId: center.id,
        classId: secondClassroom.id,
        startedAt: day("2040-01-01"),
      },
    ],
  });
  await prisma.attendanceRecord.createMany({
    data: [
      {
        centerId: center.id,
        classId: classroom.id,
        childId: workingChild.id,
        attendanceDate: day("2040-07-14"),
        status: "present",
        checkInAt: instant("2040-07-14T03:45:00.000Z"),
      },
      {
        centerId: center.id,
        classId: secondClassroom.id,
        childId: absentChild.id,
        attendanceDate: day("2040-07-14"),
        status: "absent",
        absenceReason: "family reason",
      },
      {
        centerId: center.id,
        classId: secondClassroom.id,
        childId: excusedChild.id,
        attendanceDate: day("2040-07-14"),
        status: "excused",
        absenceReason: "doctor visit",
      },
    ],
  });
  await prisma.medicationRequest.createMany({
    data: [
      {
        centerId: center.id,
        classId: classroom.id,
        childId: child.id,
        parentUserId: parent.id,
        medicineName: "Syrup",
        dosage: "5 ml",
        medicationTime: "after lunch",
        parentSignature: "Parent",
        requestedForDate: day("2040-07-14"),
        status: "pending",
      },
      {
        centerId: center.id,
        classId: classroom.id,
        childId: child.id,
        parentUserId: parent.id,
        medicineName: "Vitamin",
        dosage: "1",
        medicationTime: "morning",
        parentSignature: "Parent",
        requestedForDate: day("2040-07-14"),
        status: "administered",
      },
    ],
  });
  await prisma.mealPost.create({
    data: {
      centerId: center.id,
      authorUserId: author.id,
      mealDate: day("2040-07-14"),
      mealType: "lunch",
      menuText: "Osh",
      status: "published",
      publishedAt: instant("2040-07-14T06:00:00.000Z"),
      classes: { create: { classId: classroom.id } },
      childStatuses: {
        create: {
          childId: child.id,
          status: "ate_all",
          recordedByUserId: author.id,
        },
      },
    },
  });
  const report = await prisma.dailyReport.create({
    data: {
      centerId: center.id,
      classId: classroom.id,
      childId: child.id,
      authorUserId: author.id,
      reportDate: day("2040-07-14"),
      status: "published",
      publishedAt: instant("2040-07-14T12:00:00.000Z"),
    },
  });
  await prisma.dailyReportItem.createMany({
    data: [
      { dailyReportId: report.id, itemType: "sleep", value: "well_1h30" },
      { dailyReportId: report.id, itemType: "sleep", value: "restless" },
      { dailyReportId: report.id, itemType: "activity", title: "Drawing" },
    ],
  });
  await prisma.dailyReportComment.create({
    data: {
      dailyReportId: report.id,
      authorUserId: parent.id,
      body: "Please reply",
      createdAt: instant("2040-07-12T10:00:00.000Z"),
    },
  });
  await prisma.schedule.create({
    data: {
      centerId: center.id,
      classId: classroom.id,
      title: "English",
      startsAt: instant("2040-07-14T04:00:00.000Z"),
      endsAt: instant("2040-07-14T05:00:00.000Z"),
      createdByUserId: author.id,
    },
  });

  for (const [title, startsAt] of [
    ["Parents visit", "2040-07-15T05:00:00.000Z"],
    ["Summer concert", "2040-07-15T10:00:00.000Z"],
  ]) {
    await prisma.calendarEvent.create({
      data: {
        centerId: center.id,
        authorUserId: author.id,
        audienceType: "class",
        title,
        startsAt: instant(startsAt),
        status: "scheduled",
        classes: { create: { classId: classroom.id } },
      },
    });
  }

  const template = await prisma.studentDocumentTemplate.create({
    data: {
      centerId: center.id,
      createdByUserId: author.id,
      title: "Medical form",
      templateType: "form",
      status: "active",
    },
  });
  const pendingRequest = await prisma.studentDocumentRequest.create({
    data: {
      centerId: center.id,
      templateId: template.id,
      createdByUserId: author.id,
      targetType: "child",
      title: "Medical form",
      dueDate: day("2040-07-17"),
      status: "sent",
      children: { create: { childId: child.id } },
    },
  });
  const submittedRequest = await prisma.studentDocumentRequest.create({
    data: {
      centerId: center.id,
      templateId: template.id,
      createdByUserId: author.id,
      targetType: "child",
      title: "Already submitted form",
      dueDate: day("2040-07-17"),
      status: "sent",
      children: { create: { childId: child.id } },
      submissions: {
        create: {
          centerId: center.id,
          childId: child.id,
          submittedByUserId: parent.id,
          status: "submitted",
        },
      },
    },
  });
  assert.ok(pendingRequest.id);

  const notice = await prisma.notice.create({
    data: {
      centerId: center.id,
      classId: classroom.id,
      authorUserId: author.id,
      title: "Important meeting",
      body: "Please review",
      targetType: "class",
      status: "published",
      isImportant: true,
      publishedAt: instant("2040-07-12T10:00:00.000Z"),
      recipients: {
        create: { userId: parent.id, childId: child.id },
      },
      targets: { create: { targetKind: "class", targetId: classroom.id } },
    },
  });
  await prisma.notice.create({
    data: {
      centerId: center.id,
      classId: classroom.id,
      authorUserId: teacher.id,
      title: "Teacher's own notice",
      body: "Do not remind the author",
      targetType: "class",
      status: "published",
      isImportant: true,
      publishedAt: instant("2040-07-12T10:00:00.000Z"),
      targets: { create: { targetKind: "class", targetId: classroom.id } },
    },
  });
  assert.ok(notice.id);

  return {
    parent,
    author,
    teacher,
    clearTeacher,
    child,
    emptyChild,
    submittedRequest,
  };
}
