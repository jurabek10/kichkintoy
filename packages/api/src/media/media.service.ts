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
// Office documents parents commonly attach alongside images and PDFs.
const ALLOWED_OFFICE_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  ...ALLOWED_OFFICE_TYPES,
]);
const DEFAULT_UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024;
const DAILY_REPORT_VIDEO_LIMIT_BYTES = 100 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: MinioStorageService,
  ) {}

  async createUploadUrl(userId: string, input: CreateMediaUploadUrlInput) {
    if (input.purpose === "medication" && !ALLOWED_IMAGE_TYPES.has(input.mimeType)) {
      throw new BadRequestException("Medication uploads must be images.");
    }
    if (
      input.purpose === "daily_report" &&
      !ALLOWED_IMAGE_TYPES.has(input.mimeType) &&
      !ALLOWED_VIDEO_TYPES.has(input.mimeType)
    ) {
      throw new BadRequestException("Daily report uploads must be images or videos.");
    }
    if (
      input.purpose === "student_document" &&
      !ALLOWED_DOCUMENT_TYPES.has(input.mimeType)
    ) {
      throw new BadRequestException("Student document uploads must be images or PDFs.");
    }
    if (input.purpose === "user_avatar" && !ALLOWED_IMAGE_TYPES.has(input.mimeType)) {
      throw new BadRequestException("Profile photo must be an image.");
    }
    const maxBytes =
      input.purpose === "daily_report" && ALLOWED_VIDEO_TYPES.has(input.mimeType)
        ? DAILY_REPORT_VIDEO_LIMIT_BYTES
        : DEFAULT_UPLOAD_LIMIT_BYTES;
    if (input.sizeBytes > maxBytes) {
      throw new BadRequestException(
        input.purpose === "daily_report" && ALLOWED_VIDEO_TYPES.has(input.mimeType)
          ? "Daily report videos must be 100MB or smaller."
          : "Uploads must be 25MB or smaller.",
      );
    }
    await this.requireCenterUploader(userId, input.centerId, input.purpose);
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
    // A user may always read a profile photo they uploaded themselves (their
    // own avatar or a child's photo) — this lets any role, including parents who
    // are not center staff, display it without widening access to other media.
    const profilePurpose = objectKeyPurpose(asset.fileUrl);
    const ownsProfileMedia =
      asset.uploaderUserId === userId &&
      (profilePurpose === "user_avatar" || profilePurpose === "child_profile");
    if (
      !ownsProfileMedia &&
      !(await this.canAccessMedia(userId, mediaAssetId, asset.centerId))
    ) {
      throw new ForbiddenException("You cannot access this media asset.");
    }
    const signed = await this.storage.createDownloadUrl(asset.fileUrl);
    return mediaDownloadUrlSchema.parse({
      mediaAssetId: asset.id,
      downloadUrl: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
    });
  }

  private async requireCenterUploader(
    userId: string,
    centerId: string,
    purpose?: string,
  ) {
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
      if (
        purpose === "medication" ||
        purpose === "student_document" ||
        purpose === "user_avatar" ||
        purpose === "child_profile"
      ) {
        const guardian = await this.prisma.childGuardian.findFirst({
          where: {
            userId,
            child: {
              childEnrollments: {
                some: { centerId, enrollmentStatus: "active" },
              },
            },
          },
          select: { id: true },
        });
        if (guardian) return;
      }
      throw new ForbiddenException("You cannot upload media for this center.");
    }
  }

  private async canAccessMedia(
    userId: string,
    mediaAssetId: string,
    centerId: string,
  ) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { organizationId: true },
    });
    const director = center
      ? await this.prisma.userRole.findFirst({
          where: {
            userId,
            role: { name: { in: ["director", "organization_owner"] } },
            OR: [
              { centerId },
              { organizationId: center.organizationId, centerId: null },
            ],
          },
          select: { id: true },
        })
      : null;
    if (director) return true;

    const staff = await this.prisma.userRole.findFirst({
      where: {
        userId,
        centerId,
        role: { name: "teacher" },
      },
      select: { id: true },
    });

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
      if (
        staff &&
        (await this.teacherHasClassAccess(
          userId,
          albumMedia.post.classes.map((item) => item.classId),
        ))
      ) {
        return true;
      }
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
      if (
        staff &&
        (mealMedia.mealPost.audienceType === "center"
          ? await this.teacherHasCenterAccess(userId, mealMedia.mealPost.centerId)
          : await this.teacherHasClassAccess(
              userId,
              mealMedia.mealPost.classes.map((item) => item.classId),
            ))
      ) {
        return true;
      }
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

    const reportMedia = await this.prisma.mediaLink.findFirst({
      where: { mediaAssetId, entityType: "daily_report" },
    });
    if (reportMedia) {
      const dailyReport = await this.prisma.dailyReport.findUnique({
        where: { id: reportMedia.entityId },
      });
      if (!dailyReport) return false;
      if (
        staff &&
        (await this.teacherHasClassAccess(userId, [dailyReport.classId]))
      ) {
        return true;
      }
      if (dailyReport.status !== "published") return false;
      return Boolean(
        await this.prisma.childGuardian.findFirst({
          where: {
            userId,
            childId: dailyReport.childId,
          },
          select: { id: true },
        }),
      );
    }

    const medicationRequest = await this.prisma.medicationRequest.findFirst({
      where: {
        OR: [
          { photoMediaAssetId: mediaAssetId },
          // The parent signature is stored as the string `media:<assetId>`.
          { parentSignature: `media:${mediaAssetId}` },
        ],
      },
    });
    if (medicationRequest) {
      if (medicationRequest.parentUserId === userId) return true;
      if (!medicationRequest.classId) return false;
      return Boolean(
        await this.prisma.teacherClassAssignment.findFirst({
          where: {
            teacherUserId: userId,
            classId: medicationRequest.classId,
            endedAt: null,
          },
          select: { id: true },
        }),
      );
    }

    const documentAttachment = await this.prisma.studentDocumentAttachment.findFirst({
      where: { mediaAssetId },
      include: {
        submission: {
          include: {
            request: true,
            child: {
              include: {
                childEnrollments: {
                  where: { enrollmentStatus: "active" },
                  select: { classId: true },
                },
              },
            },
          },
        },
      },
    });
    if (documentAttachment) {
      const submission = documentAttachment.submission;
      if (submission.submittedByUserId === userId) return true;
      const guardian = await this.prisma.childGuardian.findFirst({
        where: { userId, childId: submission.childId },
        select: { id: true },
      });
      if (guardian) return true;
      return false;
    }

    return false;
  }

  private async teacherHasClassAccess(userId: string, classIds: string[]) {
    if (classIds.length === 0) return false;
    return Boolean(
      await this.prisma.teacherClassAssignment.findFirst({
        where: {
          teacherUserId: userId,
          classId: { in: classIds },
          endedAt: null,
        },
        select: { id: true },
      }),
    );
  }

  private async teacherHasCenterAccess(userId: string, centerId: string) {
    return Boolean(
      await this.prisma.teacherClassAssignment.findFirst({
        where: {
          teacherUserId: userId,
          endedAt: null,
          class: { centerId, status: "active" },
        },
        select: { id: true },
      }),
    );
  }
}

/** Object keys are `centers/{centerId}/{purpose}/{assetId}/original.ext`. */
function objectKeyPurpose(objectKey: string) {
  return objectKey.split("/")[2] ?? null;
}

function mediaTypeForMime(mimeType: string) {
  if (ALLOWED_IMAGE_TYPES.has(mimeType)) return "image";
  if (ALLOWED_VIDEO_TYPES.has(mimeType)) return "video";
  if (mimeType === "application/pdf" || ALLOWED_OFFICE_TYPES.has(mimeType)) {
    return "document";
  }
  throw new BadRequestException("Only image, video, and document uploads are allowed.");
}

function safeExtension(fileName: string, mimeType: string) {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  if (match) return match[0];
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "application/msword") return ".doc";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return ".docx";
  }
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
