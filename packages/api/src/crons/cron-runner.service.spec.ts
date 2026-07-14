import { describe, expect, it, vi } from "vitest";
import { CronRunnerService } from "./cron-runner.service";

function setup(existing: { status: string; sentCount: number } | null) {
  const prisma = {
    cronJobRun: {
      findUnique: vi.fn().mockResolvedValue(existing),
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return {
    prisma,
    service: new CronRunnerService(prisma as never),
  };
}

describe("CronRunnerService", () => {
  it("skips an automatic run that already succeeded for the date", async () => {
    const { service, prisma } = setup({ status: "succeeded", sentCount: 7 });
    const execute = vi.fn();
    await expect(
      service.run("parent.daily_digest", "2026-07-15", false, execute),
    ).resolves.toEqual({ skipped: true, sentCount: 7 });
    expect(execute).not.toHaveBeenCalled();
    expect(prisma.cronJobRun.upsert).not.toHaveBeenCalled();
  });

  it("lets a manual rerun execute and update the same date row", async () => {
    const { service, prisma } = setup({ status: "succeeded", sentCount: 7 });
    const execute = vi.fn().mockResolvedValue(0);
    await expect(
      service.run("parent.daily_digest", "2026-07-15", true, execute),
    ).resolves.toEqual({ skipped: false, sentCount: 0 });
    expect(prisma.cronJobRun.upsert).toHaveBeenCalledOnce();
    expect(prisma.cronJobRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "succeeded", sentCount: 0 }),
      }),
    );
  });
});
