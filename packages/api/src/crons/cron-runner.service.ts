import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { parseDateOnly } from "./cron-date";

export type CronRunResult = { skipped: boolean; sentCount: number };

@Injectable()
export class CronRunnerService {
  private readonly logger = new Logger(CronRunnerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(
    jobName: string,
    date: string,
    manual: boolean,
    execute: () => Promise<number>,
  ): Promise<CronRunResult> {
    const runDate = parseDateOnly(date);
    const existing = await this.prisma.cronJobRun.findUnique({
      where: { jobName_runDate: { jobName, runDate } },
    });
    if (!manual && existing?.status === "succeeded") {
      return { skipped: true, sentCount: existing.sentCount };
    }

    await this.prisma.cronJobRun.upsert({
      where: { jobName_runDate: { jobName, runDate } },
      create: { jobName, runDate },
      update: {
        status: "running",
        startedAt: new Date(),
        finishedAt: null,
        sentCount: 0,
        error: null,
      },
    });

    try {
      const sentCount = await execute();
      await this.prisma.cronJobRun.update({
        where: { jobName_runDate: { jobName, runDate } },
        data: { status: "succeeded", finishedAt: new Date(), sentCount },
      });
      return { skipped: false, sentCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`${jobName} failed for ${date}: ${message}`);
      await this.prisma.cronJobRun.update({
        where: { jobName_runDate: { jobName, runDate } },
        data: {
          status: "failed",
          finishedAt: new Date(),
          error: message.slice(0, 4000),
        },
      });
      throw error;
    }
  }
}
