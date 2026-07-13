import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { MediaService } from "./media.service";

const ASSET_ID = "11111111-1111-4111-8111-111111111111";
const CENTER_ID = "22222222-2222-4222-8222-222222222222";
const PARENT_ID = "33333333-3333-4333-8333-333333333333";
const STAFF_ID = "44444444-4444-4444-8444-444444444444";
const CLASS_ID = "55555555-5555-4555-8555-555555555555";

function createService(options: { director?: boolean; teacher?: boolean }) {
  const prisma = {
    mediaAsset: {
      findUnique: vi.fn().mockResolvedValue({
        id: ASSET_ID,
        centerId: CENTER_ID,
        uploaderUserId: STAFF_ID,
        fileUrl: `centers/${CENTER_ID}/user_avatar/${ASSET_ID}/original.jpg`,
      }),
    },
    center: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org" }) },
    userRole: {
      findFirst: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(options.director ? { id: "director-role" } : null),
    },
    albumMedia: { findFirst: vi.fn().mockResolvedValue(null) },
    mealPostMedia: { findFirst: vi.fn().mockResolvedValue(null) },
    mediaLink: { findFirst: vi.fn().mockResolvedValue(null) },
    medicationRequest: { findFirst: vi.fn().mockResolvedValue(null) },
    studentDocumentAttachment: { findFirst: vi.fn().mockResolvedValue(null) },
    child: { findFirst: vi.fn().mockResolvedValue(null) },
    user: { findFirst: vi.fn().mockResolvedValue({ id: STAFF_ID }) },
    childEnrollment: {
      findMany: vi.fn().mockResolvedValue([
        { centerId: CENTER_ID, classId: CLASS_ID },
      ]),
    },
    teacherClassAssignment: {
      findFirst: vi.fn().mockResolvedValue(options.teacher ? { id: "assignment" } : null),
    },
  };
  const storage = {
    createDownloadUrl: vi.fn().mockResolvedValue({
      url: "https://media.example/avatar.jpg",
      expiresAt: new Date("2026-07-13T12:00:00.000Z"),
    }),
  };
  return { service: new MediaService(prisma as never, {} as never, storage as never), prisma };
}

describe("MediaService staff avatar access", () => {
  it("allows a parent to view a related active-class teacher avatar", async () => {
    const { service, prisma } = createService({ teacher: true });

    await expect(service.getDownloadUrl(PARENT_ID, ASSET_ID)).resolves.toMatchObject({
      mediaAssetId: ASSET_ID,
      downloadUrl: "https://media.example/avatar.jpg",
    });
    expect(prisma.teacherClassAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherUserId: STAFF_ID,
          classId: { in: [CLASS_ID] },
          startedAt: { lte: expect.any(Date) },
        }),
      }),
    );
  });

  it("allows a parent to view a director avatar from the child's center", async () => {
    const { service, prisma } = createService({ director: true });

    await expect(service.getDownloadUrl(PARENT_ID, ASSET_ID)).resolves.toBeDefined();
    expect(prisma.teacherClassAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an unrelated staff avatar", async () => {
    const { service } = createService({});

    await expect(service.getDownloadUrl(PARENT_ID, ASSET_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe("MediaService direct-message attachment access", () => {
  function messageService(messageVisible: boolean) {
    const prisma = {
      mediaAsset: { findUnique: vi.fn().mockResolvedValue({ id: ASSET_ID, centerId: CENTER_ID, uploaderUserId: STAFF_ID, fileUrl: `centers/${CENTER_ID}/message/${ASSET_ID}/original.pdf` }) },
      mediaLink: { findFirst: vi.fn().mockResolvedValue({ entityId: "66666666-6666-4666-8666-666666666666" }) },
      message: { findFirst: vi.fn().mockResolvedValue(messageVisible ? { id: "message" } : null) },
    };
    const storage = { createDownloadUrl: vi.fn().mockResolvedValue({ url: "https://media.example/file.pdf", expiresAt: new Date("2026-07-13T12:00:00.000Z") }) };
    return { service: new MediaService(prisma as never, {} as never, storage as never), prisma };
  }

  it("allows an active thread participant to resolve the attachment", async () => {
    const { service, prisma } = messageService(true);
    await expect(service.getDownloadUrl(PARENT_ID, ASSET_ID)).resolves.toBeDefined();
    expect(prisma.message.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deletedAt: null, thread: expect.objectContaining({ participants: { some: { userId: PARENT_ID } } }) }),
    }));
  });

  it("rejects non-participants and attachments on deleted messages", async () => {
    const { service } = messageService(false);
    await expect(service.getDownloadUrl(PARENT_ID, ASSET_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
