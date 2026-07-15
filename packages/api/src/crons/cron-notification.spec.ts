import { describe, expect, it } from "vitest";
import { renderCronNotificationBody } from "@kichkintoy/shared";

const t = (key: string, values: Record<string, unknown> = {}) =>
  `${key}:${Object.entries(values)
    .filter(([name]) => name !== "defaultValue")
    .map(([name, value]) => `${name}=${String(value)}`)
    .join(",")}`;

describe("cron notification renderer", () => {
  it("renders language-neutral daily metadata instead of the fallback", () => {
    const result = renderCronNotificationBody(
      "digest.daily",
      {
        checkInAt: "2026-07-14T03:42:00.000Z",
        meals: [
          {
            mealType: "breakfast",
            menuText: "Porridge",
            eatingStatus: "ate_all",
          },
        ],
        sleepMinutes: 90,
        activities: [{ title: "Drawing" }],
      },
      t,
      "fallback",
    );
    expect(result).toContain("cron.daily.arrived:time=08:42");
    expect(result).toContain("cron.duration.hoursMinutes:hours=1,minutes=30");
    expect(result).not.toBe("fallback");
  });

  it("keeps the stored fallback for invalid metadata", () => {
    expect(
      renderCronNotificationBody("digest.daily", null, t, "fallback"),
    ).toBe("fallback");
  });

  it.each([
    [
      "teacher.attendance_summary",
      [
        {
          className: "Sun",
          total: 3,
          presentCount: 1,
          notMarkedCount: 1,
          absences: [{ reason: "sick" }],
        },
      ],
      "cron.teacher.attendance.class",
    ],
    [
      "teacher.medications_today",
      [
        {
          childFirstName: "Ali",
          medicineName: "Syrup",
          dosage: "5 ml",
          medicationTime: "after lunch",
        },
      ],
      "cron.teacher.medications.item",
    ],
    [
      "teacher.end_of_day",
      {
        missingCheckouts: 1,
        missingMealStatuses: 0,
        missingReports: 2,
        unansweredParents: 0,
        submissionsToReview: 0,
      },
      "cron.teacher.endOfDay.missingCheckouts",
    ],
    [
      "teacher.tomorrow_reminder",
      {
        events: [
          {
            title: "Visit",
            startsAt: "2026-07-16T05:00:00.000Z",
            allDay: false,
          },
        ],
        birthdays: [{ childFirstName: "Aziza" }],
      },
      "cron.teacher.tomorrow.summary",
    ],
    [
      "teacher.notice_reminder",
      [{ title: "Important" }],
      "cron.teacher.notices.summary",
    ],
  ])("renders %s metadata", (type, metadata, key) => {
    expect(renderCronNotificationBody(type, metadata, t, "fallback")).toContain(
      key,
    );
  });

  it("falls back for malformed teacher metadata", () => {
    expect(
      renderCronNotificationBody(
        "teacher.tomorrow_reminder",
        [],
        t,
        "fallback",
      ),
    ).toBe("fallback");
  });
});
