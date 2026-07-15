import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { CronNotificationsService } from "./cron-notifications.service";
import { CronRegistryService } from "./cron-registry.service";
import { CronRunnerService } from "./cron-runner.service";
import { ParentDigestCron } from "./parent-digest.cron";
import { ParentRemindersCron } from "./parent-reminders.cron";
import { TuitionReminderCron } from "./tuition-reminder.cron";
import { TeacherCrons } from "./teacher-crons";

@Module({
  imports: [PaymentsModule],
  providers: [
    CronRunnerService,
    CronNotificationsService,
    ParentDigestCron,
    ParentRemindersCron,
    TuitionReminderCron,
    TeacherCrons,
    CronRegistryService,
  ],
  exports: [CronRegistryService],
})
export class CronsModule {}
