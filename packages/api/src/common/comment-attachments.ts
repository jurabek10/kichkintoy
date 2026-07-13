import { BadRequestException } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { CommentAttachment } from "@kichkintoy/shared";

type Db = Prisma.TransactionClient | PrismaClient;

export type CommentAttachmentEntityType =
  | "report_comment"
  | "notice_comment"
  | "album_comment";

export async function linkCommentAttachments(
  tx: Prisma.TransactionClient,
  input: {
    mediaAssetIds: string[];
    centerId: string;
    userId: string;
    entityType: CommentAttachmentEntityType;
    commentId: string;
  },
) {
  if (input.mediaAssetIds.length === 0) return;
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
  const invalid = assets.find(
    (asset) =>
      asset.centerId !== input.centerId ||
      asset.uploaderUserId !== input.userId ||
      asset.status !== "complete" ||
      objectKeyPurpose(asset.fileUrl) !== "comment" ||
      asset.mediaLinks.length > 0,
  );
  if (invalid) {
    throw new BadRequestException(
      "Attachments must be completed comment uploads owned by you and not already used.",
    );
  }

  await tx.mediaLink.createMany({
    data: input.mediaAssetIds.map((mediaAssetId) => ({
      mediaAssetId,
      entityType: input.entityType,
      entityId: input.commentId,
    })),
  });
}

export async function loadCommentAttachments(
  db: Db,
  entityType: CommentAttachmentEntityType,
  commentIds: string[],
) {
  const result = new Map<string, CommentAttachment[]>();
  if (commentIds.length === 0) return result;

  const links = await db.mediaLink.findMany({
    where: { entityType, entityId: { in: commentIds } },
    include: { mediaAsset: true },
    orderBy: { createdAt: "asc" },
  });
  for (const link of links) {
    const attachment: CommentAttachment = {
      mediaAssetId: link.mediaAsset.id,
      mediaType: link.mediaAsset.mediaType === "document" ? "file" : link.mediaAsset.mediaType as "image" | "video",
      fileName: link.mediaAsset.originalFileName,
      mimeType: link.mediaAsset.mimeType,
      sizeBytes: link.mediaAsset.sizeBytes === null ? null : Number(link.mediaAsset.sizeBytes),
      thumbnailUrl: link.mediaAsset.thumbnailUrl,
    };
    const current = result.get(link.entityId) ?? [];
    current.push(attachment);
    result.set(link.entityId, current);
  }
  return result;
}

function objectKeyPurpose(objectKey: string) {
  return objectKey.split("/")[2] ?? null;
}
