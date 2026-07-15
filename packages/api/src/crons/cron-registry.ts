export type CronJobDefinition = {
  name: string;
  cronExpression: string;
  descriptionKey: string;
};

export const CRON_JOBS = [
  {
    name: "parent.daily_digest",
    cronExpression: "30 20 * * 1-6",
    descriptionKey: "crons.jobs.parent.daily_digest",
  },
  {
    name: "parent.tomorrow_events",
    cronExpression: "35 20 * * *",
    descriptionKey: "crons.jobs.parent.tomorrow_events",
  },
  {
    name: "parent.tuition_reminder",
    cronExpression: "0 10 * * 1-6",
    descriptionKey: "crons.jobs.parent.tuition_reminder",
  },
  {
    name: "parent.weekly_recap",
    cronExpression: "0 19 * * 0",
    descriptionKey: "crons.jobs.parent.weekly_recap",
  },
  {
    name: "parent.document_deadline",
    cronExpression: "5 10 * * *",
    descriptionKey: "crons.jobs.parent.document_deadline",
  },
  {
    name: "parent.notice_nudge",
    cronExpression: "30 19 * * *",
    descriptionKey: "crons.jobs.parent.notice_nudge",
  },
  {
    name: "teacher.attendance_summary",
    cronExpression: "30 9 * * 1-6",
    descriptionKey: "crons.jobs.teacher.attendance_summary",
  },
  {
    name: "teacher.medications_today",
    cronExpression: "0 12 * * 1-6",
    descriptionKey: "crons.jobs.teacher.medications_today",
  },
  {
    name: "teacher.end_of_day",
    cronExpression: "30 17 * * 1-6",
    descriptionKey: "crons.jobs.teacher.end_of_day",
  },
  {
    name: "teacher.tomorrow_reminder",
    cronExpression: "35 20 * * *",
    descriptionKey: "crons.jobs.teacher.tomorrow_reminder",
  },
  {
    name: "teacher.notice_reminder",
    cronExpression: "30 19 * * *",
    descriptionKey: "crons.jobs.teacher.notice_reminder",
  },
] as const satisfies readonly CronJobDefinition[];

export type CronJobName = (typeof CRON_JOBS)[number]["name"];

export const CRON_JOB_BY_NAME = new Map<string, CronJobDefinition>(
  CRON_JOBS.map((job) => [job.name, job]),
);
