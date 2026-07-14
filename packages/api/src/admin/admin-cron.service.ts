import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  AdminCronJob,
  AdminCronRun,
  AdminCronRunsResponse,
  AdminCronStats,
  CronRunStatus,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import {
  addDateDays,
  parseDateOnly,
  tashkentDate,
  tashkentDayBounds,
} from "../crons/cron-date";
import { CronRegistryService } from "../crons/cron-registry.service";
import { PrismaService } from "../database/prisma.service";

const PAGE_SIZE = 10;

@Injectable()
export class AdminCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly registry: CronRegistryService,
  ) {}

  async listJobs(): Promise<AdminCronJob[]> {
    const rows = await this.prisma.cronJobRun.findMany({
      where: { jobName: { in: this.registry.jobs.map((job) => job.name) } },
      orderBy: { startedAt: "desc" },
    });
    const latestByJob = new Map<string, AdminCronRun>();
    for (const row of rows) {
      if (!latestByJob.has(row.jobName))
        latestByJob.set(row.jobName, serializeRun(row));
    }
    return this.registry.jobs.map((job) => ({
      ...job,
      latestRun: latestByJob.get(job.name) ?? null,
    }));
  }

  async listRuns(input: {
    jobName?: string;
    status?: CronRunStatus;
    page: number;
  }): Promise<AdminCronRunsResponse> {
    if (input.jobName && !this.registry.has(input.jobName)) {
      throw new BadRequestException("Unknown cron job.");
    }
    const where = {
      startedAt: {
        gte: tashkentDayBounds(addDateDays(tashkentDate(), -29)).start,
      },
      ...(input.jobName ? { jobName: input.jobName } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.cronJobRun.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (input.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.cronJobRun.count({ where }),
    ]);
    return {
      items: rows.map(serializeRun),
      page: input.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async stats(jobName: string): Promise<AdminCronStats> {
    if (!this.registry.has(jobName))
      throw new BadRequestException("Unknown cron job.");
    const rows = await this.prisma.cronJobRun.findMany({
      where: {
        jobName,
        startedAt: {
          gte: tashkentDayBounds(addDateDays(tashkentDate(), -29)).start,
        },
      },
      select: { status: true, sentCount: true },
    });
    const succeeded = rows.filter((row) => row.status === "succeeded").length;
    return {
      jobName,
      totalRuns: rows.length,
      successRate:
        rows.length === 0
          ? 0
          : Math.round((succeeded / rows.length) * 1000) / 10,
      sentTotal: rows.reduce((sum, row) => sum + row.sentCount, 0),
      failureCount: rows.filter((row) => row.status === "failed").length,
    };
  }

  async runNow(input: {
    actorUserId: string;
    jobName: string;
    runDate?: string;
  }): Promise<AdminCronRun> {
    if (!this.registry.has(input.jobName))
      throw new BadRequestException("Unknown cron job.");
    const runDate = input.runDate ?? tashkentDate();
    parseDateOnly(runDate);

    try {
      await this.registry.runNow(input.jobName, runDate);
    } catch {
      // CronRunner has already persisted the failed run; return it to the admin.
    }

    const run = await this.prisma.cronJobRun.findUnique({
      where: {
        jobName_runDate: {
          jobName: input.jobName,
          runDate: parseDateOnly(runDate),
        },
      },
    });
    if (!run) throw new BadRequestException("Cron run was not recorded.");

    await this.audit.log({
      actorUserId: input.actorUserId,
      action: "cron.manual_run",
      entityType: "cron_job_run",
      entityId: run.id,
      metadata: { jobName: input.jobName, runDate },
    });
    return serializeRun(run);
  }
}

function serializeRun(run: {
  id: string;
  jobName: string;
  runDate: Date;
  startedAt: Date;
  finishedAt: Date | null;
  status: string;
  sentCount: number;
  error: string | null;
}): AdminCronRun {
  return {
    id: run.id,
    jobName: run.jobName,
    runDate: run.runDate.toISOString().slice(0, 10),
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    status: run.status as CronRunStatus,
    sentCount: run.sentCount,
    error: run.error,
  };
}
