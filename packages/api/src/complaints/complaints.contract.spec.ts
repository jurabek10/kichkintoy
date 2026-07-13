import { describe, expect, it } from "vitest";
import {
  appContract,
  complaintSetStatusInputSchema,
  createComplaintInputSchema,
} from "@kichkintoy/shared";

describe("complaints contract", () => {
  it("does not expose content edit or delete procedures", () => {
    expect(Object.keys(appContract.complaints).sort()).toEqual([
      "create",
      "detail",
      "openCount",
      "parentList",
      "reply",
      "setStatus",
      "staffList",
      "withdraw",
    ]);
  });

  it("requires a resolution note when resolving", () => {
    expect(
      complaintSetStatusInputSchema.safeParse({
        complaintId: "11111111-1111-4111-8111-111111111111",
        status: "resolved",
      }).success,
    ).toBe(false);
  });

  it("enforces immutable content bounds at creation", () => {
    expect(
      createComplaintInputSchema.safeParse({
        childId: "11111111-1111-4111-8111-111111111111",
        category: "safety",
        subject: "x".repeat(121),
        body: "Unsafe gate",
        visibility: "director_only",
      }).success,
    ).toBe(false);
  });
});
