import { describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService idempotent enqueue", () => {
  it("treats a dedupe-key conflict as an already delivered notification", async () => {
    const transaction = vi.fn().mockRejectedValue({ code: "P2002" });
    const service = new NotificationsService(
      { $transaction: transaction } as never,
      {} as never,
      { publishNotification: vi.fn() } as never,
    );

    await expect(
      service.enqueue({
        userId: "1f166f4c-e38a-438d-bc25-fcbe1a514999",
        notificationType: "digest.daily",
        title: "Daily summary",
        dedupeKey: "cron:stable-key",
        channels: ["in_app", "push"],
      }),
    ).resolves.toEqual([]);
  });

  it("does not hide unrelated database failures", async () => {
    const failure = new Error("database offline");
    const service = new NotificationsService(
      { $transaction: vi.fn().mockRejectedValue(failure) } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.enqueue({
        userId: "1f166f4c-e38a-438d-bc25-fcbe1a514999",
        notificationType: "digest.daily",
        title: "Daily summary",
        dedupeKey: "cron:stable-key",
        channels: ["in_app"],
      }),
    ).rejects.toBe(failure);
  });
});
