import { describe, expect, it } from "vitest";
import {
  addDateDays,
  daysBetween,
  parseDateOnly,
  tashkentDayBounds,
  tashkentInstant,
} from "./cron-date";

describe("cron date helpers", () => {
  it("uses Tashkent midnight bounds", () => {
    const bounds = tashkentDayBounds("2026-07-14");
    expect(bounds.start.toISOString()).toBe("2026-07-13T19:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-14T19:00:00.000Z");
    expect(tashkentInstant("2026-07-14", 19, 30).toISOString()).toBe(
      "2026-07-14T14:30:00.000Z",
    );
  });

  it("shifts date-only values without host timezone drift", () => {
    expect(addDateDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(daysBetween("2026-07-14", "2026-07-21")).toBe(7);
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => parseDateOnly("14.07.2026")).toThrow();
    expect(() => parseDateOnly("2026-02-30")).toThrow();
  });
});
