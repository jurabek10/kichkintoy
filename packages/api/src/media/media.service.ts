import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  mediaAssetSchema,
  mediaDownloadUrlSchema,
  mediaUploadUrlSchema,
  type CreateMediaUploadUrlInput,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { MinioStorageService } from "./minio-storage.service";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: MinioStorageService,
  ) {}

  async createUploadUrl(userId: string, input: CreateMediaUploadUrlInput) {
    await this.requireCenterUploader(userId, input.centerId);
    const mediaType = mediaTypeForMime(input.mimeType);
    const extension = safeExtension(input.fileName, input.mimeType);
    const asset = await this.prisma.mediaAsset.create({
      data: {
        centerId: input.centerId,
        uploaderUserId: userId,
        fileUrl: "pending",
        thumbnailUrl: null,
        mediaType,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
      },
    });
    const objectKey = [
      "centers",
      input.centerId,
      input.purpose,
      asset.id,
      `original${extension}`,
    ].join("/");
    const signed = await this.storage.createUploadUrl({
      objectKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { fileUrl: objectKey },
    });
    await this.audit.log({
      centerId: input.centerId,
      actorUserId: userId,
      action: "media.upload_url_created",
      entityType: "media_asset",
      entityId: asset.id,
      metadata: { purpose: input.purpose, mimeType: input.mimeType },
    });
    return mediaUploadUrlSchema.parse({
      mediaAssetId: asset.id,
      uploadUrl: signed.url,
      objectKey,
      expiresAt: signed.expiresAt.toISOString(),
    });
  }

  async completeUpload(userId: string, mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });
    if (!asset) throw new NotFoundException("Media asset not found.");
    if (asset.uploaderUserId !== userId) {
      await this.requireCenterUploader(userId, asset.centerId);
    }
    return mediaAssetSchema.parse(toMediaAsset(asset));
  }

  async getDownloadUrl(userId: string, mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });
    if (!asset) throw new NotFoundException("Media asset not found.");
    if (!(await this.canAccessMedia(userId, mediaAssetId, asset.centerId))) {
      throw new ForbiddenException("You cannot access this media asset.");
    }
    const signed = await this.storage.createDownloadUrl(asset.fileUrl);
    return mediaDownloadUrlSchema.parse({
      mediaAssetId: asset.id,
      downloadUrl: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
    });
  }

  private async requireCenterUploader(userId: string, centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, organizationId: true },
    });
    if (!center) throw new ForbiddenException("Center not found.");
    const staff = await this.prisma.userRole.findFirst({
      where: {
        userId,
        OR: [
          {
            centerId,
            role: { name: { in: ["director", "teacher"] } },
          },
          {
            organizationId: center.organizationId,
            centerId: null,
            role: { name: "organization_owner" },
          },
        ],
      },
    });
    if (!staff) {
      throw new ForbiddenException("You cannot upload media for this center.");
    }
  }

  private async canAccessMedia(
    userId: string,
    mediaAssetId: string,
    centerId: string,
  ) {
    const staff = await this.prisma.userRole.findFirst({
      where: {
        userId,
        centerId,
        role: { name: { in: ["director", "teacher"] } },
      },
      select: { id: true },
    });
    if (staff) return true;

    const albumMedia = await this.prisma.albumMedia.findFirst({
      where: { mediaAssetId },
      include: {
        post: {
          include: {
            classes: true,
            children: true,
          },
        },
      },
    });
    if (albumMedia?.post.status === "published") {
      if (albumMedia.post.visibility === "tagged_children") {
        return Boolean(
          await this.prisma.childGuardian.findFirst({
            where: {
              userId,
              childId: {
                in: albumMedia.post.children.map((item) => item.childId),
              },
            },
            select: { id: true },
          }),
        );
      }
      return Boolean(
        await this.prisma.childGuardian.findFirst({
          where: {
            userId,
            child: {
              childEnrollments: {
                some: {
                  enrollmentStatus: "active",
                  classId: {
                    in: albumMedia.post.classes.map((item) => item.classId),
                  },
                },
              },
            },
          },
          select: { id: true },
        }),
      );
    }

    const mealMedia = await this.prisma.mealPostMedia.findFirst({
      where: { mediaAssetId },
      include: {
        mealPost: {
          include: {
            classes: true,
          },
        },
      },
    });
    if (mealMedia?.mealPost.status === "published") {
      if (mealMedia.mealPost.audienceType === "center") {
        return Boolean(
          await this.prisma.childGuardian.findFirst({
            where: {
              userId,
              child: {
                childEnrollments: {
                  some: {
                    centerId: mealMedia.mealPost.centerId,
                    enrollmentStatus: "active",
                  },
                },
              },
            },
            select: { id: true },
          }),
        );
      }
      return Boolean(
        await this.prisma.childGuardian.findFirst({
          where: {
            userId,
            child: {
              childEnrollments: {
                some: {
                  enrollmentStatus: "active",
                  classId: {
                    in: mealMedia.mealPost.classes.map((item) => item.classId),
                  },
                },
              },
            },
          },
          select: { id: true },
        }),
      );
    }

    return false;
  }
}

function mediaTypeForMime(mimeType: string) {
  if (ALLOWED_IMAGE_TYPES.has(mimeType)) return "image";
  if (ALLOWED_VIDEO_TYPES.has(mimeType)) return "video";
  throw new BadRequestException("Only image and video uploads are allowed.");
}

function safeExtension(fileName: string, mimeType: string) {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  if (match) return match[0];
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "video/mp4") return ".mp4";
  return "";
}

function toMediaAsset(asset: {
  id: string;
  centerId: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  mediaType: string;
  mimeType: string | null;
  sizeBytes: bigint | null;
  createdAt: Date;
}) {
  return {
    id: asset.id,
    centerId: asset.centerId,
    fileUrl: asset.fileUrl,
    thumbnailUrl: asset.thumbnailUrl,
    mediaType: asset.mediaType,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes === null ? null : Number(asset.sizeBytes),
    createdAt: asset.createdAt.toISOString(),
  };
}
