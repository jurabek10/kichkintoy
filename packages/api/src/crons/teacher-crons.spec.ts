import { describe, expect, it, vi } from "vitest";
import { TeacherCrons } from "./teacher-crons";

const assignment = {
  teacherUserId: "teacher-1",
  classId: "class-1",
  class: { id: "class-1", name: "Sun", centerId: "center-1" },
};

function serviceWith(prisma: Record<string, unknown>) {
  const notifications = {
    enqueueOnceForDay: vi.fn().mockResolvedValue(true),
    previouslyNudgedNoticeIds: vi.fn().mockResolvedValue(new Set<string>()),
  };
  const runs = {
    run: vi.fn(
      async (
        _name: string,
        _date: string,
        _manual: boolean,
        work: () => Promise<number>,
      ) => ({ skipped: false, sentCount: await work() }),
    ),
  };
  return {
    service: new TeacherCrons(
      prisma as never,
      runs as never,
      notifications as never,
    ),
    notifications,
  };
}

describe("TeacherCrons", () => {
  it("always sends attendance and preserves absence reasons", async () => {
    const { service, notifications } = serviceWith({
      teacherClassAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
      },
      childEnrollment: {
        findMany: vi.fn().mockResolvedValue([
          {
            classId: "class-1",
            childId: "child-1",
            child: { firstName: "Ali" },
          },
          {
            classId: "class-1",
            childId: "child-2",
            child: { firstName: "Vali" },
          },
          {
            classId: "class-1",
            childId: "child-3",
            child: { firstName: "Aziza" },
          },
          {
            classId: "class-1",
            childId: "child-4",
            child: { firstName: "Bek" },
          },
        ]),
      },
      attendanceRecord: {
        findMany: vi.fn().mockResolvedValue([
          {
            classId: "class-1",
            childId: "child-1",
            status: "present",
            absenceReason: null,
            child: { firstName: "Ali" },
          },
          {
            classId: "class-1",
            childId: "child-2",
            status: "absent",
            absenceReason: "sick",
            child: { firstName: "Vali" },
          },
          {
            classId: "class-1",
            childId: "child-4",
            status: "excused",
            absenceReason: "family trip",
            child: { firstName: "Bek" },
          },
        ]),
      },
    });
    await service.runAttendanceSummary("2026-07-15", true);
    const metadata = notifications.enqueueOnceForDay.mock.calls[0]![0].metadata;
    expect(metadata[0]).toMatchObject({
      total: 4,
      presentCount: 1,
      notMarkedCount: 1,
      absences: [{ reason: "sick" }, { reason: "family trip" }],
    });
  });

  it("keeps medications silent when no pending request exists", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const { service, notifications } = serviceWith({
      teacherClassAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
      },
      medicationRequest: { findMany },
    });
    await service.runMedicationsToday("2026-07-15", true);
    expect(notifications.enqueueOnceForDay).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "pending" }),
      }),
    );
  });

  it("counts every actionable end-of-day checklist category", async () => {
    const childEnrollmentFindMany = vi.fn().mockResolvedValueOnce([
      { childId: "child-1", classId: "class-1" },
      { childId: "child-2", classId: "class-1" },
    ]);
    const { service, notifications } = serviceWith({
      teacherClassAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
      },
      childEnrollment: { findMany: childEnrollmentFindMany },
      attendanceRecord: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ childId: "child-1" }, { childId: "child-2" }]),
        count: vi.fn().mockResolvedValue(1),
      },
      mealPost: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "meal-1",
            centerId: "center-1",
            classes: [{ classId: "class-1" }],
            childStatuses: [{ childId: "child-1" }],
          },
        ]),
      },
      dailyReport: {
        findMany: vi.fn().mockResolvedValue([{ childId: "child-1" }]),
      },
      studentDocumentSubmission: { count: vi.fn().mockResolvedValue(1) },
      childGuardian: {
        findMany: vi.fn().mockResolvedValue([{ userId: "parent-1" }]),
      },
      dailyReportComment: {
        findMany: vi.fn().mockResolvedValue([
          {
            dailyReportId: "report-1",
            authorUserId: "parent-1",
            createdAt: new Date("2026-07-13T10:00:00.000Z"),
          },
        ]),
      },
      noticeComment: { findMany: vi.fn().mockResolvedValue([]) },
      conversationThread: { findMany: vi.fn().mockResolvedValue([]) },
    });
    await service.runEndOfDay("2026-07-15", true);
    expect(
      notifications.enqueueOnceForDay.mock.calls[0]![0].metadata,
    ).toMatchObject({
      missingCheckouts: 1,
      missingMealStatuses: 1,
      missingReports: 1,
      unansweredParents: 1,
      submissionsToReview: 1,
    });
  });

  it("stays silent when the end-of-day checklist is clear", async () => {
    const conversationFindMany = vi.fn().mockResolvedValue([]);
    const { service, notifications } = serviceWith({
      teacherClassAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
      },
      childEnrollment: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ childId: "child-1", classId: "class-1" }]),
      },
      attendanceRecord: {
        findMany: vi.fn().mockResolvedValue([{ childId: "child-1" }]),
        count: vi.fn().mockResolvedValue(0),
      },
      mealPost: { findMany: vi.fn().mockResolvedValue([]) },
      dailyReport: {
        findMany: vi.fn().mockResolvedValue([{ childId: "child-1" }]),
      },
      studentDocumentSubmission: { count: vi.fn().mockResolvedValue(0) },
      childGuardian: { findMany: vi.fn().mockResolvedValue([]) },
      dailyReportComment: { findMany: vi.fn().mockResolvedValue([]) },
      noticeComment: { findMany: vi.fn().mockResolvedValue([]) },
      conversationThread: { findMany: conversationFindMany },
    });

    await service.runEndOfDay("2026-07-15", true);

    expect(notifications.enqueueOnceForDay).not.toHaveBeenCalled();
    expect(conversationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          centerId: { in: ["center-1"] },
          threadType: "direct",
        }),
      }),
    );
  });

  it("matches birthdays by month and day, regardless of year", async () => {
    const { service, notifications } = serviceWith({
      teacherClassAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
      },
      calendarEvent: { findMany: vi.fn().mockResolvedValue([]) },
      childEnrollment: {
        findMany: vi.fn().mockResolvedValue([
          {
            child: {
              id: "child-1",
              firstName: "Aziza",
              dob: new Date("2019-07-16T00:00:00.000Z"),
            },
          },
        ]),
      },
    });
    await service.runTomorrowReminder("2026-07-15", true);
    expect(
      notifications.enqueueOnceForDay.mock.calls[0]![0].metadata.birthdays,
    ).toEqual([{ childId: "child-1", childFirstName: "Aziza" }]);
  });

  it("bundles an event and birthday into one notification", async () => {
    const { service, notifications } = serviceWith({
      teacherClassAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
      },
      calendarEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "event-1",
            centerId: "center-1",
            audienceType: "class",
            title: "Parents visit",
            startsAt: new Date("2026-07-16T05:00:00.000Z"),
            endsAt: null,
            allDay: false,
            locationText: null,
            classes: [{ classId: "class-1" }],
            children: [],
          },
        ]),
      },
      childEnrollment: {
        findMany: vi.fn().mockResolvedValue([
          {
            child: {
              id: "child-1",
              firstName: "Aziza",
              dob: new Date("2019-07-16T00:00:00.000Z"),
            },
          },
        ]),
      },
    });

    await service.runTomorrowReminder("2026-07-15", true);

    expect(notifications.enqueueOnceForDay).toHaveBeenCalledTimes(1);
    expect(notifications.enqueueOnceForDay.mock.calls[0]![0]).toMatchObject({
      entityType: null,
      entityId: null,
      metadata: {
        events: [expect.objectContaining({ eventId: "event-1" })],
        birthdays: [{ childId: "child-1", childFirstName: "Aziza" }],
      },
    });
  });

  it("reminds 29 Feb birthdays only when tomorrow is 29 Feb", async () => {
    const prismaWith = (dob: Date) => ({
      teacherClassAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
      },
      calendarEvent: { findMany: vi.fn().mockResolvedValue([]) },
      childEnrollment: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { child: { id: "child-1", firstName: "Lola", dob } },
          ]),
      },
    });
    const leapDob = new Date("2024-02-29T00:00:00.000Z");

    // 2028 is a leap year: tomorrow (29 Feb) matches.
    const leap = serviceWith(prismaWith(leapDob));
    await leap.service.runTomorrowReminder("2028-02-28", true);
    expect(
      leap.notifications.enqueueOnceForDay.mock.calls[0]![0].metadata.birthdays,
    ).toHaveLength(1);

    // 2026 is not: 1 Mar does not match, so nothing is sent.
    const common = serviceWith(prismaWith(leapDob));
    await common.service.runTomorrowReminder("2026-02-28", true);
    expect(common.notifications.enqueueOnceForDay).not.toHaveBeenCalled();
  });

  it("does not re-nudge prior or self-authored notices", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        { id: "old", title: "Old", requiresConfirmation: true },
      ]);
    const { service, notifications } = serviceWith({
      teacherClassAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
      },
      notice: { findMany },
    });
    notifications.previouslyNudgedNoticeIds.mockResolvedValue(new Set(["old"]));
    await service.runNoticeReminder("2026-07-15", true);
    expect(notifications.enqueueOnceForDay).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorUserId: { not: "teacher-1" } }),
      }),
    );
  });
});
