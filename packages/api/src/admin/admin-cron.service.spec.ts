import { describe, expect, it, vi } from "vitest";
import { AdminCronService } from "./admin-cron.service";

const jobs = [
  {
    name: "parent.daily_digest",
    cronExpression: "30 20 * * 1-6",
    descriptionKey: "crons.jobs.parent.daily_digest",
  },
  {
    name: "parent.weekly_recap",
    cronExpression: "0 19 * * 0",
    descriptionKey: "crons.jobs.parent.weekly_recap",
  },
] as const;

function runRow(overrides: Partial<ReturnType<typeof baseRun>> = {}) {
  return { ...baseRun(), ...overrides };
}

function baseRun() {
  return {
    id: "6fbeaa9d-f4bc-4cbb-8362-b578b2db1227",
    jobName: "parent.daily_digest",
    runDate: new Date("2026-07-15T00:00:00.000Z"),
    startedAt: new Date("2026-07-15T15:30:00.000Z"),
    finishedAt: new Date("2026-07-15T15:30:01.200Z"),
    status: "succeeded",
    sentCount: 4,
    error: null,
  };
}

function setup(args?: { rows?: ReturnType<typeof baseRun>[]; count?: number }) {
  const rows = args?.rows ?? [];
  const prisma = {
    cronJobRun: {
      findMany: vi.fn().mockResolvedValue(rows),
      count: vi.fn().mockResolvedValue(args?.count ?? rows.length),
      findUnique: vi.fn().mockResolvedValue(rows[0] ?? baseRun()),
    },
  };
  const audit = { log: vi.fn().mockResolvedValue({}) };
  const registry = {
    jobs,
    has: vi.fn((name: string) => jobs.some((job) => job.name === name)),
    runNow: vi.fn().mockResolvedValue({ skipped: false, sentCount: 0 }),
  };
  const service = new AdminCronService(
    prisma as never,
    audit as never,
    registry as never,
  );
  return { service, prisma, audit, registry };
}

describe("AdminCronService", () => {
  it("lists registry jobs even when none has run", async () => {
    const { service } = setup();
    await expect(service.listJobs()).resolves.toEqual(
      jobs.map((job) => ({ ...job, latestRun: null })),
    );
  });

  it("joins each registry entry to its latest recorded run", async () => {
    const { service } = setup({
      rows: [
        runRow(),
        runRow({
          id: "6cb08c30-ef56-4e4f-a7bc-cf035a135817",
          jobName: "parent.weekly_recap",
        }),
      ],
    });
    const result = await service.listJobs();
    expect(result.map((job) => job.latestRun?.jobName)).toEqual([
      "parent.daily_digest",
      "parent.weekly_recap",
    ]);
  });

  it("calculates 30-day aggregates", async () => {
    const { service } = setup({
      rows: [
        runRow({ status: "succeeded", sentCount: 5 }),
        runRow({ status: "failed", sentCount: 0 }),
        runRow({ status: "succeeded", sentCount: 3 }),
      ],
    });
    await expect(service.stats("parent.daily_digest")).resolves.toMatchObject({
      totalRuns: 3,
      successRate: 66.7,
      sentTotal: 8,
      failureCount: 1,
    });
  });

  it("applies job/status filters and server pagination to recent runs", async () => {
    const row = runRow();
    const { service, prisma } = setup({ rows: [row], count: 14 });
    const result = await service.listRuns({
      jobName: "parent.daily_digest",
      status: "succeeded",
      page: 2,
    });
    expect(prisma.cronJobRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          jobName: "parent.daily_digest",
          status: "succeeded",
          startedAt: { gte: expect.any(Date) },
        }),
        skip: 10,
        take: 10,
      }),
    );
    expect(result).toMatchObject({
      page: 2,
      pageSize: 10,
      total: 14,
      totalPages: 2,
    });
  });

  it("runs through the registry and audit-logs the manual execution", async () => {
    const row = runRow({ sentCount: 0 });
    const { service, registry, audit } = setup({ rows: [row] });
    const result = await service.runNow({
      actorUserId: "70992243-2851-42df-ad64-9a023e19cf3d",
      jobName: "parent.daily_digest",
      runDate: "2026-07-15",
    });
    expect(registry.runNow).toHaveBeenCalledWith(
      "parent.daily_digest",
      "2026-07-15",
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "cron.manual_run",
        entityId: row.id,
        metadata: {
          jobName: "parent.daily_digest",
          runDate: "2026-07-15",
        },
      }),
    );
    expect(result.sentCount).toBe(0);
  });

  it("rejects names outside the static registry", async () => {
    const { service } = setup();
    await expect(service.stats("unknown.job")).rejects.toThrow(
      "Unknown cron job",
    );
  });
});
