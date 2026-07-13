import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { messageContactSchema, sendMessageInputSchema, type MessageContact } from "@kichkintoy/shared";
import { MessagesService } from "./messages.service";

function serviceWith(prisma: Record<string, unknown>) {
  return new MessagesService(
    prisma as never,
    { log: vi.fn() } as never,
    { enqueue: vi.fn() } as never,
    {
      publishMessageCreated: vi.fn(),
      publishMessageDeleted: vi.fn(),
      publishThreadRead: vi.fn(),
    } as never,
  );
}

describe("MessagesService privacy rules", () => {
  it("returns the same not-found error when a caller is not a participant", async () => {
    const service = serviceWith({
      conversationThread: { findFirst: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.thread("user-a", "thread-b")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("does not let a participant delete another sender's message", async () => {
    const service = serviceWith({
      message: {
        findUnique: vi.fn().mockResolvedValue({
          id: "message-a",
          senderUserId: "user-b",
          threadId: "thread-a",
        }),
      },
    });

    await expect(service.deleteMessage("user-a", "message-a")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("message body contract", () => {
  it("accepts text or attachments and enforces message limits", () => {
    expect(sendMessageInputSchema.parse({ body: "  hello  " }).body).toBe("hello");
    expect(sendMessageInputSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(sendMessageInputSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
    expect(sendMessageInputSchema.safeParse({
      attachmentMediaAssetIds: ["11111111-1111-4111-8111-111111111111"],
    }).success).toBe(true);
    expect(sendMessageInputSchema.safeParse({
      attachmentMediaAssetIds: Array.from(
        { length: 5 },
        (_, index) => `11111111-1111-4111-8111-11111111111${index}`,
      ),
    }).success).toBe(false);
  });
});

describe("parent message contacts", () => {
  it("queries only active-class teachers and center directors", async () => {
    const teacher = {
      id: "teacher-a",
      fullName: "Related Teacher",
      avatarUrl: null,
    };
    const prisma = {
      userRole: {
        findMany: vi.fn().mockResolvedValue([
          { user: { id: "director-a", fullName: "Center Director", avatarUrl: null } },
        ]),
      },
      childEnrollment: {
        findMany: vi.fn().mockResolvedValue([
          {
            classId: "class-a",
            class: {
              name: "Quyoshcha",
              teacherClassAssignments: [{ teacherUser: teacher }],
            },
          },
        ]),
      },
    };
    const service = serviceWith(prisma);
    const contacts = await (
      service as unknown as {
        allowedContactsForScope(
          userId: string,
          scope: {
            centerId: string;
            centerName: string;
            organizationId: string;
            role: "parent";
          },
        ): Promise<MessageContact[]>;
      }
    ).allowedContactsForScope("parent-a", {
      centerId: "center-a",
      centerName: "Center",
      organizationId: "organization-a",
      role: "parent",
    });

    expect(contacts.map((item) => item.userId)).toEqual(["director-a", "teacher-a"]);
    expect(prisma.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ centerId: "center-a", role: { name: "director" } }],
        }),
      }),
    );
    expect(prisma.childEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          class: expect.objectContaining({
            select: expect.objectContaining({
              teacherClassAssignments: expect.objectContaining({
                where: expect.objectContaining({
                  startedAt: { lte: expect.any(Date) },
                  teacherUser: { status: "active" },
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("accepts structured parent identity context", () => {
    expect(
      messageContactSchema.parse({
        userId: "11111111-1111-4111-8111-111111111111",
        displayName: "Sardor Samiyev",
        photoMediaAssetId: null,
        photoUrl: null,
        role: "parent",
        parentContext: {
          className: "Quyoshcha",
          childName: "Azizbek",
          relationship: "dad",
        },
        classLabel: null,
        centerId: "22222222-2222-4222-8222-222222222222",
      }).parentContext,
    ).toEqual({ className: "Quyoshcha", childName: "Azizbek", relationship: "dad" });
  });
});
