import { BadRequestException } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { MessageAttachment } from "@kichkintoy/shared";

type Db = Prisma.TransactionClient | PrismaClient;
export type MessageKind = "text" | "image" | "video" | "file";

export async function linkMessageAttachments(
  tx: Prisma.TransactionClient,
  input: {
    mediaAssetIds: string[];
    centerId: string;
    userId: string;
    messageId: string;
  },
): Promise<MessageKind> {
  if (input.mediaAssetIds.length === 0) return "text";
  if (new Set(input.mediaAssetIds).size !== input.mediaAssetIds.length) {
    throw new BadRequestException("An attachment can only be added once.");
  }

  const assets = await tx.mediaAsset.findMany({
    where: { id: { in: input.mediaAssetIds } },
    include: { mediaLinks: { select: { id: true } } },
  });
  if (assets.length !== input.mediaAssetIds.length) {
    throw new BadRequestException("One or more attachments were not found.");
  }
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const ordered = input.mediaAssetIds.map((id) => byId.get(id)!);
  const invalid = ordered.find(
    (asset) =>
      asset.centerId !== input.centerId ||
      asset.uploaderUserId !== input.userId ||
      asset.status !== "complete" ||
      objectKeyPurpose(asset.fileUrl) !== "message" ||
      asset.mediaLinks.length > 0,
  );
  if (invalid) {
    throw new BadRequestException(
      "Attachments must be completed message uploads owned by you and not already used.",
    );
  }

  await tx.mediaLink.createMany({
    data: input.mediaAssetIds.map((mediaAssetId) => ({
      mediaAssetId,
      entityType: "message",
      entityId: input.messageId,
    })),
  });
  return attachmentKind(ordered[0]!.mediaType);
}

export async function loadMessageAttachments(db: Db, messageIds: string[]) {
  const result = new Map<string, MessageAttachment[]>();
  if (messageIds.length === 0) return result;
  const links = await db.mediaLink.findMany({
    where: { entityType: "message", entityId: { in: messageIds } },
    include: { mediaAsset: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (const link of links) {
    const asset = link.mediaAsset;
    const attachment: MessageAttachment = {
      mediaAssetId: asset.id,
      mediaType: attachmentKind(asset.mediaType) as Exclude<MessageKind, "text">,
      fileName: asset.originalFileName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes === null ? null : Number(asset.sizeBytes),
      thumbnailUrl: asset.thumbnailUrl,
      width: asset.width,
      height: asset.height,
    };
    const current = result.get(link.entityId) ?? [];
    current.push(attachment);
    result.set(link.entityId, current);
  }
  return result;
}

export function messageKind(value: string | null | undefined): MessageKind | null {
  return value === "text" || value === "image" || value === "video" || value === "file"
    ? value
    : null;
}

function attachmentKind(mediaType: string): Exclude<MessageKind, "text"> {
  if (mediaType === "image" || mediaType === "video") return mediaType;
  return "file";
}

function objectKeyPurpose(objectKey: string) {
  return objectKey.split("/")[2] ?? null;
}
