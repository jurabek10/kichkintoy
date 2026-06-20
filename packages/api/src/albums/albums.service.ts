import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  albumAudienceResponseSchema,
  albumCommentSchema,
  albumListResponseSchema,
  albumPostDetailSchema,
  albumReactionSummarySchema,
  albumVisibilitySchema,
  type CreateAlbumPostInput,
  type UpdateAlbumPostBody,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const albumInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
  authorUser: { select: { id: true, fullName: true } },
  classes: { include: { class: { select: { id: true, name: true } } } },
  children: {
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          childEnrollments: {
            where: { enrollmentStatus: "active" },
            select: {
              classId: true,
              class: { select: { name: true } },
            },
            take: 1,
          },
        },
      },
    },
  },
  media: {
    include: {
      mediaAsset: {
        select: {
          id: true,
          fileUrl: true,
          thumbnailUrl: true,
          mediaType: true,
          mimeType: true,
        },
      },
    },
    orderBy: { position: "asc" as const },
  },
  comments: {
    include: { authorUser: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  reactions: { select: { userId: true, kind: true } },
} satisfies Prisma.AlbumPostInclude;

type AlbumPayload = Prisma.AlbumPostGetPayload<{ include: typeof albumInclude }>;

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async audience(userId: string, centerId: string) {
    const scope = await this.requireStaffScope(userId, centerId);
    const classIds = scope.director ? undefined : scope.classIds;
    const classes = await this.prisma.class.findMany({
      where: {
        centerId,
        status: "active",
        ...(classIds ? { id: { in: classIds } } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    const children = await this.prisma.childEnrollment.findMany({
      where: {
        centerId,
        enrollmentStatus: "active",
        classId: { in: classes.map((item) => item.id) },
      },
      orderBy: { child: { firstName: "asc" } },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
    });

    return albumAudienceResponseSchema.parse({
      classes,
      children: children.map((enrollment) => ({
        id: enrollment.child.id,
        name: childName(enrollment.child),
        classId: enrollment.classId,
        className: enrollment.class?.name ?? null,
      })),
    });
  }

  async listForStaff(userId: string, centerId: string, status?: string) {
    const scope = await this.requireStaffScope(userId, centerId);
    const posts = await this.prisma.albumPost.findMany({
      where: {
        centerId,
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(scope.director
          ? {}
          : { classes: { some: { classId: { in: scope.classIds } } } }),
      },
      include: albumInclude,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });
    return albumListResponseSchema.parse(
      posts.map((post) => this.toSummary(post, userId)),
    );
  }

  async listForParent(userId: string, childId?: string) {
    const access = await this.parentAccess(userId, childId);
    const posts = await this.prisma.albumPost.findMany({
      where: {
        deletedAt: null,
        status: "published",
        OR: [
          {
            visibility: "class",
            classes: { some: { classId: { in: access.classIds } } },
          },
          {
            visibility: "tagged_children",
            children: { some: { childId: { in: access.childIds } } },
          },
        ],
      },
      include: albumInclude,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });
    return albumListResponseSchema.parse(
      posts.map((post) => this.toSummary(post, userId)),
    );
  }

  async get(userId: string, postId: string) {
    const post = await this.findPost(postId);
    if (!(await this.canViewPost(userId, post))) {
      throw new ForbiddenException("You cannot access this album post.");
    }
    return albumPostDetailSchema.parse(this.toDetail(post, userId));
  }

  async create(userId: string, input: CreateAlbumPostInput) {
    await this.validateAlbumInput(userId, input.centerId, input);
    const publishedAt = input.publish ? new Date() : null;
    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.albumPost.create({
        data: {
          centerId: input.centerId,
          classId: input.classIds[0] ?? null,
          authorUserId: userId,
          caption: clean(input.caption),
          body: clean(input.caption),
          visibility: input.visibility,
          targetType: input.visibility,
          status: input.publish ? "published" : "draft",
          allowComments: input.allowComments,
          publishedAt,
          classes: {
            createMany: {
              data: unique(input.classIds).map((classId) => ({ classId })),
            },
          },
          children: {
            createMany: {
              data: unique(input.childIds).map((childId) => ({ childId })),
            },
          },
          media: {
            createMany: {
              data: unique(input.mediaAssetIds).map((mediaAssetId, index) => ({
                mediaAssetId,
                position: index,
              })),
            },
          },
        },
        include: albumInclude,
      });
      await this.audit.log(
        {
          organizationId: created.center.organizationId,
          centerId: created.centerId,
          actorUserId: userId,
          action: input.publish ? "album_post.published" : "album_post.created",
          entityType: "album_post",
          entityId: created.id,
        },
        tx,
      );
      if (input.publish) await this.notifyPublished(tx, created.id);
      return created;
    });
    return albumPostDetailSchema.parse(this.toDetail(post, userId));
  }

  async update(userId: string, postId: string, input: UpdateAlbumPostBody) {
    const existing = await this.findPost(postId);
    await this.requireManagePost(userId, existing);
    await this.validateAlbumInput(userId, existing.centerId, {
      centerId: existing.centerId,
      caption: input.caption ?? existing.caption,
      visibility:
        input.visibility ?? albumVisibilitySchema.parse(existing.visibility),
      classIds: input.classIds ?? existing.classes.map((item) => item.classId),
      childIds: input.childIds ?? existing.children.map((item) => item.childId),
      mediaAssetIds:
        input.mediaAssetIds ??
        existing.media.map((item) => item.mediaAssetId),
      allowComments: input.allowComments ?? existing.allowComments,
      publish: false,
    });

    const post = await this.prisma.$transaction(async (tx) => {
      const classIds =
        input.classIds ?? existing.classes.map((item) => item.classId);
      const childIds =
        input.childIds ?? existing.children.map((item) => item.childId);
      const mediaAssetIds =
        input.mediaAssetIds ??
        existing.media.map((item) => item.mediaAssetId);

      await tx.albumPostClass.deleteMany({ where: { postId } });
      await tx.albumPostChild.deleteMany({ where: { albumPostId: postId } });
      await tx.albumMedia.deleteMany({ where: { postId } });

      const updated = await tx.albumPost.update({
        where: { id: postId },
        data: {
          caption: input.caption === undefined ? undefined : clean(input.caption),
          body: input.caption === undefined ? undefined : clean(input.caption),
          visibility: input.visibility,
          targetType: input.visibility,
          classId: classIds[0] ?? null,
          allowComments: input.allowComments,
          classes: {
            createMany: {
              data: unique(classIds).map((classId) => ({ classId })),
            },
          },
          children: {
            createMany: {
              data: unique(childIds).map((childId) => ({ childId })),
            },
          },
          media: {
            createMany: {
              data: unique(mediaAssetIds).map((mediaAssetId, index) => ({
                mediaAssetId,
                position: index,
              })),
            },
          },
        },
        include: albumInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "album_post.updated",
          entityType: "album_post",
          entityId: updated.id,
        },
        tx,
      );
      return updated;
    });
    return albumPostDetailSchema.parse(this.toDetail(post, userId));
  }

  async publish(userId: string, postId: string) {
    const existing = await this.findPost(postId);
    await this.requireManagePost(userId, existing);
    if (existing.media.length === 0 && !clean(existing.caption)) {
      throw new BadRequestException("Add a caption or photo before publishing.");
    }
    const post = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.albumPost.update({
        where: { id: postId },
        data: { status: "published", publishedAt: new Date() },
        include: albumInclude,
      });
      await this.notifyPublished(tx, postId);
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "album_post.published",
          entityType: "album_post",
          entityId: updated.id,
        },
        tx,
      );
      return updated;
    });
    return albumPostDetailSchema.parse(this.toDetail(post, userId));
  }

  async delete(userId: string, postId: string) {
    const post = await this.findPost(postId);
    await this.requireManagePost(userId, post);
    await this.prisma.$transaction(async (tx) => {
      await tx.albumPost.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      });
      await this.audit.log(
        {
          organizationId: post.center.organizationId,
          centerId: post.centerId,
          actorUserId: userId,
          action: "album_post.deleted",
          entityType: "album_post",
          entityId: postId,
        },
        tx,
      );
    });
    return { success: true };
  }

  async addComment(userId: string, postId: string, body: string) {
    const post = await this.findPost(postId);
    if (!(await this.canViewPost(userId, post))) {
      throw new ForbiddenException("You cannot comment on this album post.");
    }
    if (!post.allowComments || post.status !== "published") {
      throw new BadRequestException("Comments are disabled for this album post.");
    }
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.albumComment.create({
        data: { postId, authorUserId: userId, body: clean(body) },
        include: { authorUser: { select: { id: true, fullName: true } } },
      });
      await this.notifyComment(tx, post, userId);
      return created;
    });
    return albumCommentSchema.parse(toComment(comment));
  }

  async deleteComment(userId: string, postId: string, commentId: string) {
    const post = await this.findPost(postId);
    const comment = await this.prisma.albumComment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.postId !== postId) {
      throw new NotFoundException("Comment not found.");
    }
    const canManage = await this.canManagePost(userId, post);
    if (!canManage && comment.authorUserId !== userId) {
      throw new ForbiddenException("You cannot delete this comment.");
    }
    await this.prisma.albumComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async toggleReaction(userId: string, postId: string) {
    const post = await this.findPost(postId);
    if (!(await this.canViewPost(userId, post))) {
      throw new ForbiddenException("You cannot react to this album post.");
    }
    const existing = await this.prisma.albumReaction.findUnique({
      where: { postId_userId_kind: { postId, userId, kind: "heart" } },
    });
    if (existing) {
      await this.prisma.albumReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.albumReaction.create({
        data: { postId, userId, kind: "heart" },
      });
    }
    const fresh = await this.findPost(postId);
    return albumReactionSummarySchema.parse(this.reactionSummary(fresh, userId));
  }

  private async validateAlbumInput(
    userId: string,
    centerId: string,
    input: CreateAlbumPostInput,
  ) {
    const scope = await this.requireStaffScope(userId, centerId);
    const classIds = unique(input.classIds);
    if (classIds.length === 0) {
      throw new BadRequestException("Choose at least one class.");
    }
    if (!scope.director && classIds.some((id) => !scope.classIds.includes(id))) {
      throw new ForbiddenException("You can only use assigned classes.");
    }
    const classCount = await this.prisma.class.count({
      where: { id: { in: classIds }, centerId, status: "active" },
    });
    if (classCount !== classIds.length) {
      throw new BadRequestException("One or more classes were not found.");
    }
    const childIds = unique(input.childIds);
    if (input.visibility === "tagged_children" && childIds.length === 0) {
      throw new BadRequestException("Tag at least one child.");
    }
    if (childIds.length > 0) {
      const childCount = await this.prisma.childEnrollment.count({
        where: {
          centerId,
          enrollmentStatus: "active",
          classId: { in: classIds },
          childId: { in: childIds },
        },
      });
      if (childCount !== childIds.length) {
        throw new BadRequestException(
          "One or more tagged children are outside the selected classes.",
        );
      }
    }
    const mediaAssetIds = unique(input.mediaAssetIds);
    if (mediaAssetIds.length > 0) {
      const mediaCount = await this.prisma.mediaAsset.count({
        where: { id: { in: mediaAssetIds }, centerId },
      });
      if (mediaCount !== mediaAssetIds.length) {
        throw new BadRequestException("One or more media assets were not found.");
      }
    }
  }

  private async findPost(postId: string) {
    const post = await this.prisma.albumPost.findFirst({
      where: { id: postId, deletedAt: null },
      include: albumInclude,
    });
    if (!post) throw new NotFoundException("Album post not found.");
    return post;
  }

  private async requireStaffScope(userId: string, centerId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, organizationId: true },
    });
    if (!center) throw new ForbiddenException("Center not found.");
    const director = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: { in: ["director", "organization_owner"] } },
        OR: [
          { centerId },
          { organizationId: center.organizationId, centerId: null },
        ],
      },
    });
    if (director) return { director: true, classIds: [] as string[] };
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: {
        teacherUserId: userId,
        endedAt: null,
        class: { centerId, status: "active" },
      },
      select: { classId: true },
    });
    if (assignments.length === 0) {
      throw new ForbiddenException("You cannot manage albums for this center.");
    }
    return {
      director: false,
      classIds: assignments.map((item) => item.classId),
    };
  }

  private async canManagePost(userId: string, post: AlbumPayload) {
    const scope = await this.requireStaffScope(userId, post.centerId).catch(
      () => null,
    );
    if (!scope) return false;
    if (scope.director || post.authorUserId === userId) return true;
    return post.classes.some((item) => scope.classIds.includes(item.classId));
  }

  private async requireManagePost(userId: string, post: AlbumPayload) {
    if (!(await this.canManagePost(userId, post))) {
      throw new ForbiddenException("You cannot manage this album post.");
    }
  }

  private async canViewPost(userId: string, post: AlbumPayload) {
    if (await this.canManagePost(userId, post)) return true;
    const access = await this.parentAccess(userId).catch(() => null);
    if (!access || post.status !== "published") return false;
    if (post.visibility === "class") {
      return post.classes.some((item) => access.classIds.includes(item.classId));
    }
    return post.children.some((item) => access.childIds.includes(item.childId));
  }

  private async parentAccess(userId: string, childId?: string) {
    const guardians = await this.prisma.childGuardian.findMany({
      where: { userId, ...(childId ? { childId } : {}) },
      include: {
        child: {
          include: {
            childEnrollments: {
              where: { enrollmentStatus: "active" },
              select: { childId: true, classId: true },
            },
          },
        },
      },
    });
    const childIds = guardians.map((item) => item.childId);
    if (childId && !childIds.includes(childId)) {
      throw new ForbiddenException("You cannot access this child.");
    }
    const classIds = guardians.flatMap((item) =>
      item.child.childEnrollments
        .map((enrollment) => enrollment.classId)
        .filter((id): id is string => Boolean(id)),
    );
    if (childIds.length === 0) {
      throw new ForbiddenException("No linked children found.");
    }
    return { childIds, classIds: unique(classIds) };
  }

  private async notifyPublished(tx: Tx, postId: string) {
    const post = await tx.albumPost.findUnique({
      where: { id: postId },
      include: {
        classes: true,
        children: true,
      },
    });
    if (!post) return;
    const guardians = await tx.childGuardian.findMany({
      where:
        post.visibility === "tagged_children"
          ? { childId: { in: post.children.map((item) => item.childId) } }
          : {
              child: {
                childEnrollments: {
                  some: {
                    enrollmentStatus: "active",
                    classId: { in: post.classes.map((item) => item.classId) },
                  },
                },
              },
            },
      select: { userId: true },
    });
    await Promise.all(
      unique(guardians.map((item) => item.userId)).map((recipientUserId) =>
        this.notifications.enqueue(
          {
            userId: recipientUserId,
            notificationType: "album_post.published",
            title: "New album photos",
            body: post.caption
              ? post.caption.slice(0, 120)
              : "New class photos are ready.",
            entityType: "album_post",
            entityId: post.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private async notifyComment(tx: Tx, post: AlbumPayload, authorUserId: string) {
    const participants = new Set<string>([
      post.authorUserId,
      ...post.comments.map((comment) => comment.authorUserId),
    ]);
    participants.delete(authorUserId);
    await Promise.all(
      [...participants].map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: "album_post.comment_created",
            title: "New album comment",
            body: "A new comment was added to an album post.",
            entityType: "album_post",
            entityId: post.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private toSummary(post: AlbumPayload, userId: string) {
    const activeComments = post.comments.filter((comment) => !comment.deletedAt);
    const media = post.media.map((item) => toMedia(item));
    return {
      id: post.id,
      centerId: post.centerId,
      centerName: post.center.name,
      author: post.authorUser,
      caption: post.caption,
      bodyPreview: post.caption.slice(0, 180),
      visibility: post.visibility,
      status: post.status,
      allowComments: post.allowComments,
      classes: post.classes.map((item) => item.class),
      children: post.children.map((item) => toTaggedChild(item.child)),
      coverMedia: media[0] ?? null,
      previewMedia: media.slice(0, 3),
      mediaCount: media.length,
      commentCount: activeComments.length,
      reactionSummary: this.reactionSummary(post, userId),
      publishedAt: post.publishedAt?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private toDetail(post: AlbumPayload, userId: string) {
    return {
      ...this.toSummary(post, userId),
      media: post.media.map((item) => toMedia(item)),
      comments: post.comments.map(toComment),
    };
  }

  private reactionSummary(post: AlbumPayload, userId: string) {
    return {
      heartCount: post.reactions.filter((reaction) => reaction.kind === "heart")
        .length,
      myReaction: post.reactions.some(
        (reaction) => reaction.userId === userId && reaction.kind === "heart",
      )
        ? "heart"
        : null,
    };
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function childName(child: { firstName: string; lastName: string | null }) {
  return [child.firstName, child.lastName].filter(Boolean).join(" ");
}

function toTaggedChild(child: AlbumPayload["children"][number]["child"]) {
  const enrollment = child.childEnrollments[0];
  return {
    id: child.id,
    name: childName(child),
    classId: enrollment?.classId ?? null,
    className: enrollment?.class?.name ?? null,
  };
}

function toMedia(item: AlbumPayload["media"][number]) {
  return {
    id: item.id,
    assetId: item.mediaAsset.id,
    fileUrl: item.mediaAsset.id,
    thumbnailUrl: null,
    mediaType: item.mediaAsset.mediaType,
    mimeType: item.mediaAsset.mimeType,
    position: item.position,
  };
}

function toComment(
  comment:
    | AlbumPayload["comments"][number]
    | Prisma.AlbumCommentGetPayload<{
        include: { authorUser: { select: { id: true; fullName: true } } };
      }>,
) {
  return {
    id: comment.id,
    authorUserId: comment.authorUserId,
    authorName: comment.authorUser.fullName,
    body: comment.deletedAt ? "" : comment.body,
    deletedAt: comment.deletedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
