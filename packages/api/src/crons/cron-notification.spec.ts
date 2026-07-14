import { describe, expect, it } from "vitest";
import { renderCronNotificationBody } from "@kichkintoy/shared";

const t = (key: string, values: Record<string, unknown> = {}) =>
  `${key}:${Object.entries(values)
    .filter(([name]) => name !== "defaultValue")
    .map(([name, value]) => `${name}=${String(value)}`)
    .join(",")}`;

describe("cron notification renderer", () => {
  it("renders language-neutral daily metadata instead of the fallback", () => {
    const result = renderCronNotificationBody(
      "digest.daily",
      {
        checkInAt: "2026-07-14T03:42:00.000Z",
        meals: [
          {
            mealType: "breakfast",
            menuText: "Porridge",
            eatingStatus: "ate_all",
          },
        ],
        sleepMinutes: 90,
        activities: [{ title: "Drawing" }],
      },
      t,
      "fallback",
    );
    expect(result).toContain("cron.daily.arrived:time=08:42");
    expect(result).toContain("cron.duration.hoursMinutes:hours=1,minutes=30");
    expect(result).not.toBe("fallback");
  });

  it("keeps the stored fallback for invalid metadata", () => {
    expect(
      renderCronNotificationBody("digest.daily", null, t, "fallback"),
    ).toBe("fallback");
  });
});
