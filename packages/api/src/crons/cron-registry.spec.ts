import { describe, expect, it } from "vitest";
import { CRON_JOBS } from "./cron-registry";

describe("teacher cron registry", () => {
  it("contains the approved teacher schedules", () => {
    expect(
      Object.fromEntries(
        CRON_JOBS.map((job) => [job.name, job.cronExpression]),
      ),
    ).toMatchObject({
      "teacher.attendance_summary": "30 9 * * 1-6",
      "teacher.medications_today": "0 12 * * 1-6",
      "teacher.end_of_day": "30 17 * * 1-6",
      "teacher.tomorrow_reminder": "35 20 * * *",
      "teacher.notice_reminder": "30 19 * * *",
    });
  });
});
