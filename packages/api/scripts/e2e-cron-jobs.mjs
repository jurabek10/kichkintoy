import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { CronNotificationsService } from "../dist/crons/cron-notifications.service.js";
import { CronRunnerService } from "../dist/crons/cron-runner.service.js";
import { ParentDigestCron } from "../dist/crons/parent-digest.cron.js";
import { ParentRemindersCron } from "../dist/crons/parent-reminders.cron.js";
import { TuitionReminderCron } from "../dist/crons/tuition-reminder.cron.js";
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

const day = (value) => new Date(`${value}T00:00:00.000Z`);
const instant = (value) => new Date(value);

try {
  const fixture = await seedFixture();
  const results = {};

  results.daily = await digests.runDailyDigest("2040-07-14", true);
  assert.equal(results.daily.sentCount, 1);
  assert.equal((await digests.runDailyDigest("2040-07-14", true)).sentCount, 0);

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
      jobsVerified: 6,
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
  const [parent, author] = await Promise.all([
    prisma.user.create({
      data: { username: `cron_parent_${Date.now()}`, fullName: "Cron Parent" },
    }),
    prisma.user.create({
      data: { username: `cron_author_${Date.now()}`, fullName: "Cron Author" },
    }),
  ]);
  const child = await prisma.child.create({
    data: { firstName: "Aziza", dob: day("2035-04-10") },
  });
  const emptyChild = await prisma.child.create({
    data: { firstName: "Bek", dob: day("2035-05-11") },
  });
  await Promise.all([
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
      status: "present",
      checkInAt: instant("2040-07-14T03:30:00.000Z"),
      checkOutAt: instant("2040-07-14T12:15:00.000Z"),
      pickedUpBy: "Otabek",
      pickedUpRelationship: "father",
    },
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
      { dailyReportId: report.id, itemType: "activity", title: "Drawing" },
    ],
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
    },
  });
  assert.ok(notice.id);

  return { parent, author, child, emptyChild, submittedRequest };
}
