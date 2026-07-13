import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { linkMessageAttachments } from "./message-attachments";

const IMAGE_ID = "11111111-1111-4111-8111-111111111111";

describe("message attachment linking", () => {
  it("links completed, unused message uploads and returns the first kind", async () => {
    const tx = {
      mediaAsset: { findMany: vi.fn().mockResolvedValue([{ id: IMAGE_ID, centerId: "center", uploaderUserId: "user", status: "complete", fileUrl: `centers/center/message/${IMAGE_ID}/original.jpg`, mediaType: "image", mediaLinks: [] }]) },
      mediaLink: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    await expect(linkMessageAttachments(tx as never, { mediaAssetIds: [IMAGE_ID], centerId: "center", userId: "user", messageId: "message" })).resolves.toBe("image");
    expect(tx.mediaLink.createMany).toHaveBeenCalledWith({ data: [{ mediaAssetId: IMAGE_ID, entityType: "message", entityId: "message" }] });
  });

  it("rejects assets from another purpose or an existing link", async () => {
    const tx = {
      mediaAsset: { findMany: vi.fn().mockResolvedValue([{ id: IMAGE_ID, centerId: "center", uploaderUserId: "user", status: "complete", fileUrl: `centers/center/comment/${IMAGE_ID}/original.jpg`, mediaType: "image", mediaLinks: [{ id: "used" }] }]) },
      mediaLink: { createMany: vi.fn() },
    };
    await expect(linkMessageAttachments(tx as never, { mediaAssetIds: [IMAGE_ID], centerId: "center", userId: "user", messageId: "message" })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.mediaLink.createMany).not.toHaveBeenCalled();
  });
});
