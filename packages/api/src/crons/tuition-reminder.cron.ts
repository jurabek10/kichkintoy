import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { currentTashkentMonth, dateOnly } from "../common/tashkent-month";
import { InvoiceMaterializationService } from "../payments/invoice-materialization.service";
import {
  daysBetween,
  parseDateOnly,
  tashkentDate,
  TASHKENT_TIME_ZONE,
} from "./cron-date";
import { CronNotificationsService } from "./cron-notifications.service";
import { CronRunnerService, type CronRunResult } from "./cron-runner.service";
import { CRON_JOB_BY_NAME } from "./cron-registry";

type PaymentPhase = "upcoming" | "due_tomorrow" | "due_today" | "overdue";

@Injectable()
export class TuitionReminderCron {
  private readonly logger = new Logger(TuitionReminderCron.name);

  constructor(
    private readonly invoices: InvoiceMaterializationService,
    private readonly runs: CronRunnerService,
    private readonly cronNotifications: CronNotificationsService,
  ) {}

  @Cron(CRON_JOB_BY_NAME.get("parent.tuition_reminder")!.cronExpression, {
    timeZone: TASHKENT_TIME_ZONE,
  })
  tuitionReminders() {
    return this.runTuitionReminders(tashkentDate());
  }

  runTuitionReminders(date: string, manual = false): Promise<CronRunResult> {
    return this.runs.run("parent.tuition_reminder", date, manual, () =>
      this.sendTuitionReminders(date),
    );
  }

  private async sendTuitionReminders(date: string): Promise<number> {
    const month = currentTashkentMonth(parseDateOnly(date));
    const enrollments = await this.invoices.primaryGuardianEnrollments();
    let sent = 0;
    for (const enrollment of enrollments) {
      try {
        const invoice = await this.invoices.ensureMonthInvoice(
          enrollment,
          month,
        );
        if (
          invoice.status === "paid" ||
          invoice.status === "cancelled" ||
          !invoice.dueDate
        )
          continue;
        const dueDate = dateOnly(invoice.dueDate);
        const daysUntilDue = daysBetween(date, dueDate);
        if (daysUntilDue > 7) continue;
        const phase: PaymentPhase =
          daysUntilDue < 0
            ? "overdue"
            : daysUntilDue === 0
              ? "due_today"
              : daysUntilDue === 1
                ? "due_tomorrow"
                : "upcoming";
        const created = await this.cronNotifications.enqueueOnceForDay(
          {
            userId: enrollment.parentUserId,
            notificationType: "payment.reminder",
            title: "Tuition payment reminder",
            body: `Tuition for ${enrollment.childName} is ${fallbackPhase(phase)}.`,
            entityType: "invoice",
            entityId: invoice.id,
            priority: phase === "upcoming" ? "normal" : "high",
            metadata: {
              childId: enrollment.childId,
              childFirstName:
                enrollment.childName.split(" ")[0] ?? enrollment.childName,
              amount: Number(invoice.amount),
              currency: invoice.currency,
              dueDate,
              phase,
            },
            channels: ["in_app", "push"],
          },
          date,
        );
        if (created) sent += 1;
      } catch (error) {
        this.logger.error(
          `Tuition reminder failed for child ${enrollment.childId}: ${errorText(error)}`,
        );
      }
    }
    return sent;
  }
}

function fallbackPhase(phase: PaymentPhase): string {
  if (phase === "due_today") return "due today";
  if (phase === "due_tomorrow") return "due tomorrow";
  if (phase === "overdue") return "overdue";
  return "due soon";
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
