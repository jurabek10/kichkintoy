import { describe, expect, it, vi } from "vitest";
import { ChatToolsService } from "./chat-tools.service";

const CHILDREN = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Azizbek",
    name: "Azizbek Sobirjonov",
    dateOfBirth: "2021-03-12",
    className: "Quyoshcha",
    centerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    isPrimary: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    firstName: "Omina",
    name: "Omina Sobirjonova",
    dateOfBirth: "2023-08-07",
    className: "Yulduzcha",
    centerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    isPrimary: false,
  },
];

function makeService() {
  const profileService = { listChildren: vi.fn().mockResolvedValue(CHILDREN) };
  const service = new ChatToolsService(
    profileService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, profileService };
}

describe("ChatToolsService family scope", () => {
  it("loads every child guarded by the parent", async () => {
    const { service, profileService } = makeService();

    const scope = await service.buildScope("parent-1");

    expect(profileService.listChildren).toHaveBeenCalledWith("parent-1");
    expect(scope.children).toEqual([
      expect.objectContaining({ id: CHILDREN[0].id, name: CHILDREN[0].name }),
      expect.objectContaining({ id: CHILDREN[1].id, name: CHILDREN[1].name }),
    ]);
  });

  it("uses the requested guarded child instead of a primary/global child", async () => {
    const { service } = makeService();
    const scope = await service.buildScope("parent-1");

    const result = await service.execute(scope, "getChildProfile", {
      childId: CHILDREN[1].id,
    });

    expect(result).toEqual(
      expect.objectContaining({
        child: "Omina Sobirjonova",
        birthday: "2023-08-07",
        className: "Yulduzcha",
      }),
    );
  });

  it("rejects a child-specific tool call without a child ID", async () => {
    const { service } = makeService();
    const scope = await service.buildScope("parent-1");

    await expect(
      service.execute(scope, "getChildProfile", {}),
    ).rejects.toThrow("childId is required");
  });

  it("rejects a child ID outside the parent's guarded-child allowlist", async () => {
    const { service } = makeService();
    const scope = await service.buildScope("parent-1");

    await expect(
      service.execute(scope, "getChildProfile", {
        childId: "33333333-3333-4333-8333-333333333333",
      }),
    ).rejects.toThrow("not available to this parent");
  });
});
