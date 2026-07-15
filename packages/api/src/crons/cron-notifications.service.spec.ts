import { describe, expect, it, vi } from "vitest";
import { CronNotificationsService } from "./cron-notifications.service";

function createService() {
  const claimed = new Set<string>();
  const prisma = {
    notification: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  const notifications = {
    enqueue: vi.fn(async (input: { dedupeKey?: string | null }) => {
      if (!input.dedupeKey || claimed.has(input.dedupeKey)) return [];
      claimed.add(input.dedupeKey);
      return [{ channel: "in_app" }];
    }),
  };
  return {
    service: new CronNotificationsService(
      prisma as never,
      notifications as never,
    ),
    notifications,
    prisma,
  };
}

const input = {
  userId: "1f166f4c-e38a-438d-bc25-fcbe1a514999",
  notificationType: "digest.daily",
  title: "Daily summary",
  body: "Summary",
  entityType: "child",
  entityId: "19d8e32d-9896-4e01-bab9-473103d3b24d",
  metadata: { date: "2000-01-01" },
  channels: ["in_app", "push"] as Array<"in_app" | "push">,
};

describe("CronNotificationsService logical idempotency", () => {
  it("uses the same key when a historical date is rerun today", async () => {
    const { service, notifications } = createService();

    await expect(service.enqueueOnceForDay(input, "2000-01-01")).resolves.toBe(
      true,
    );
    await expect(service.enqueueOnceForDay(input, "2000-01-01")).resolves.toBe(
      false,
    );

    const firstKey = notifications.enqueue.mock.calls[0]![0].dedupeKey;
    const secondKey = notifications.enqueue.mock.calls[1]![0].dedupeKey;
    expect(firstKey).toBe(secondKey);
    expect(firstKey).toMatch(/^cron:/);
  });

  it("uses a different key for a different processing date", async () => {
    const { service, notifications } = createService();

    await service.enqueueOnceForDay(input, "2000-01-01");
    await service.enqueueOnceForDay(input, "2000-01-02");

    expect(notifications.enqueue.mock.calls[0]![0].dedupeKey).not.toBe(
      notifications.enqueue.mock.calls[1]![0].dedupeKey,
    );
  });

  it("finds teacher notice ids stored as an entity or inside bundle metadata", async () => {
    const { service, prisma } = createService();
    prisma.notification.findMany.mockResolvedValue([
      { entityId: "notice-1", metadata: null },
      {
        entityId: null,
        metadata: [{ noticeId: "notice-2" }, { noticeId: "notice-3" }],
      },
    ]);

    await expect(
      service.previouslyNudgedNoticeIds(
        input.userId,
        "teacher.notice_reminder",
      ),
    ).resolves.toEqual(new Set(["notice-1", "notice-2", "notice-3"]));
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          notificationType: "teacher.notice_reminder",
        }),
      }),
    );
  });
});
