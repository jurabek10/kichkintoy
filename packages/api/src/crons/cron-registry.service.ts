import { BadRequestException, Injectable } from "@nestjs/common";
import { CRON_JOB_BY_NAME, CRON_JOBS, type CronJobName } from "./cron-registry";
import { ParentDigestCron } from "./parent-digest.cron";
import { ParentRemindersCron } from "./parent-reminders.cron";
import { TuitionReminderCron } from "./tuition-reminder.cron";

@Injectable()
export class CronRegistryService {
  readonly jobs = CRON_JOBS;

  constructor(
    private readonly digests: ParentDigestCron,
    private readonly reminders: ParentRemindersCron,
    private readonly tuition: TuitionReminderCron,
  ) {}

  has(jobName: string): jobName is CronJobName {
    return CRON_JOB_BY_NAME.has(jobName);
  }

  runNow(jobName: string, runDate: string) {
    if (!this.has(jobName)) throw new BadRequestException("Unknown cron job.");
    const jobs: Record<
      CronJobName,
      () => ReturnType<ParentDigestCron["runDailyDigest"]>
    > = {
      "parent.daily_digest": () => this.digests.runDailyDigest(runDate, true),
      "parent.tomorrow_events": () =>
        this.reminders.runTomorrowEvents(runDate, true),
      "parent.tuition_reminder": () =>
        this.tuition.runTuitionReminders(runDate, true),
      "parent.weekly_recap": () => this.digests.runWeeklyRecap(runDate, true),
      "parent.document_deadline": () =>
        this.reminders.runDocumentDeadlines(runDate, true),
      "parent.notice_nudge": () =>
        this.reminders.runNoticeNudges(runDate, true),
    };
    return jobs[jobName]();
  }
}
