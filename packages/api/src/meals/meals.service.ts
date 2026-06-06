import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  mealAudienceResponseSchema,
  mealAudienceTypeSchema,
  mealEatingStatusSchema,
  mealListResponseSchema,
  mealPostDetailSchema,
  mealTypeSchema,
  type CreateMealPostInput,
  type MealChildStatusInput,
  type UpdateMealPostBody,
} from "@kichkintoy/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type Tx = Prisma.TransactionClient;

const mealInclude = {
  center: { select: { id: true, name: true, organizationId: true } },
  authorUser: { select: { id: true, fullName: true } },
  classes: { include: { class: { select: { id: true, name: true } } } },
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
  childStatuses: {
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
    orderBy: { recordedAt: "asc" as const },
  },
} satisfies Prisma.MealPostInclude;

type MealPayload = Prisma.MealPostGetPayload<{ include: typeof mealInclude }>;

@Injectable()
export class MealsService {
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
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { child: { firstName: "asc" } },
    });
    return mealAudienceResponseSchema.parse({
      classes,
      children: children.map((enrollment) => ({
        id: enrollment.child.id,
        name: childName(enrollment.child),
        classId: enrollment.classId,
        className: enrollment.class?.name ?? null,
      })),
    });
  }

  async listForStaff(
    userId: string,
    centerId: string,
    filters: { date?: string; status?: string; mealType?: string } = {},
  ) {
    const scope = await this.requireStaffScope(userId, centerId);
    const posts = await this.prisma.mealPost.findMany({
      where: {
        centerId,
        deletedAt: null,
        ...(filters.date ? { mealDate: parseDate(filters.date) } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.mealType ? { mealType: filters.mealType } : {}),
        ...(scope.director
          ? {}
          : {
              OR: [
                { classes: { some: { classId: { in: scope.classIds } } } },
                {
                  audienceType: "center",
                  center: {
                    classes: { some: { id: { in: scope.classIds } } },
                  },
                },
              ],
            }),
      },
      include: mealInclude,
      orderBy: [{ mealDate: "desc" }, { mealType: "asc" }],
    });
    return mealListResponseSchema.parse(
      posts.map((post) => this.toSummary(post, userId)),
    );
  }

  async listForParent(userId: string, childId?: string, date?: string) {
    const access = await this.parentAccess(userId, childId);
    const targetDate = parseDate(date ?? todayIso());
    const posts = await this.prisma.mealPost.findMany({
      where: {
        deletedAt: null,
        status: "published",
        mealDate: targetDate,
        OR: [
          { audienceType: "center", centerId: { in: access.centerIds } },
          { classes: { some: { classId: { in: access.classIds } } } },
        ],
      },
      include: mealInclude,
      orderBy: { mealType: "asc" },
    });
    return mealListResponseSchema.parse(
      posts.map((post) => this.toSummary(post, userId, access.childIds)),
    );
  }

  async get(userId: string, mealId: string) {
    const meal = await this.findMeal(mealId);
    if (!(await this.canViewMeal(userId, meal))) {
      throw new ForbiddenException("You cannot access this meal.");
    }
    const access = await this.parentAccess(userId).catch(() => null);
    return mealPostDetailSchema.parse(
      this.toDetail(meal, userId, access?.childIds),
    );
  }

  async create(userId: string, input: CreateMealPostInput) {
    await this.validateMealInput(userId, input.centerId, input);
    const classRows =
      input.audienceType === "class"
        ? unique(input.classIds).map((classId) => ({ classId }))
        : [];
    const mediaRows = unique(input.mediaAssetIds).map((mediaAssetId, index) => ({
      mediaAssetId,
      position: index,
    }));
    const childStatusRows = input.childStatuses.map((status) => ({
      childId: status.childId,
      status: status.status,
      note: emptyToNull(status.note),
      recordedByUserId: userId,
    }));
    const meal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.mealPost.create({
        data: {
          centerId: input.centerId,
          authorUserId: userId,
          mealDate: parseDate(input.mealDate),
          mealType: input.mealType,
          audienceType: input.audienceType,
          menuText: clean(input.menuText),
          allergyNote: emptyToNull(input.allergyNote),
          status: input.publish ? "published" : "draft",
          publishedAt: input.publish ? new Date() : null,
          classes: classRows.length
            ? { createMany: { data: classRows } }
            : undefined,
          media: mediaRows.length
            ? { createMany: { data: mediaRows } }
            : undefined,
          childStatuses: childStatusRows.length
            ? { createMany: { data: childStatusRows } }
            : undefined,
        },
        include: mealInclude,
      });
      await this.audit.log(
        {
          organizationId: created.center.organizationId,
          centerId: created.centerId,
          actorUserId: userId,
          action: input.publish ? "meal_post.published" : "meal_post.created",
          entityType: "meal_post",
          entityId: created.id,
        },
        tx,
      );
      if (input.publish) await this.notifyPublished(tx, created.id);
      return created;
    });
    return mealPostDetailSchema.parse(this.toDetail(meal, userId));
  }

  async update(userId: string, mealId: string, input: UpdateMealPostBody) {
    const existing = await this.findMeal(mealId);
    await this.requireManageMeal(userId, existing);
    const next = {
      centerId: existing.centerId,
      mealDate: input.mealDate ?? toIsoDate(existing.mealDate),
      mealType: input.mealType ?? mealTypeSchema.parse(existing.mealType),
      audienceType:
        input.audienceType ?? mealAudienceTypeSchema.parse(existing.audienceType),
      classIds: input.classIds ?? existing.classes.map((item) => item.classId),
      menuText: input.menuText ?? existing.menuText,
      allergyNote: input.allergyNote ?? existing.allergyNote ?? undefined,
      mediaAssetIds:
        input.mediaAssetIds ??
        existing.media.map((item) => item.mediaAssetId),
      childStatuses:
        input.childStatuses ??
        existing.childStatuses.map((item) => ({
          childId: item.childId,
          status: mealEatingStatusSchema.parse(item.status),
          note: item.note ?? undefined,
        })),
      publish: false,
    };
    await this.validateMealInput(userId, existing.centerId, next);
    const classRows =
      next.audienceType === "class"
        ? unique(next.classIds).map((classId) => ({ classId }))
        : [];
    const mediaRows = unique(next.mediaAssetIds).map((mediaAssetId, index) => ({
      mediaAssetId,
      position: index,
    }));
    const childStatusRows = next.childStatuses.map((status) => ({
      childId: status.childId,
      status: status.status,
      note: emptyToNull(status.note),
      recordedByUserId: userId,
    }));

    const meal = await this.prisma.$transaction(async (tx) => {
      await tx.mealPostClass.deleteMany({ where: { mealPostId: mealId } });
      await tx.mealPostMedia.deleteMany({ where: { mealPostId: mealId } });
      await tx.mealChildStatus.deleteMany({ where: { mealPostId: mealId } });
      const updated = await tx.mealPost.update({
        where: { id: mealId },
        data: {
          mealDate: input.mealDate ? parseDate(input.mealDate) : undefined,
          mealType: input.mealType,
          audienceType: input.audienceType,
          menuText: input.menuText === undefined ? undefined : clean(input.menuText),
          allergyNote:
            input.allergyNote === undefined
              ? undefined
              : emptyToNull(input.allergyNote),
          classes: classRows.length
            ? { createMany: { data: classRows } }
            : undefined,
          media: mediaRows.length
            ? { createMany: { data: mediaRows } }
            : undefined,
          childStatuses: childStatusRows.length
            ? { createMany: { data: childStatusRows } }
            : undefined,
        },
        include: mealInclude,
      });
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "meal_post.updated",
          entityType: "meal_post",
          entityId: updated.id,
        },
        tx,
      );
      return updated;
    });
    return mealPostDetailSchema.parse(this.toDetail(meal, userId));
  }

  async publish(userId: string, mealId: string) {
    const existing = await this.findMeal(mealId);
    await this.requireManageMeal(userId, existing);
    const meal = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.mealPost.update({
        where: { id: mealId },
        data: { status: "published", publishedAt: new Date() },
        include: mealInclude,
      });
      await this.notifyPublished(tx, mealId);
      await this.audit.log(
        {
          organizationId: updated.center.organizationId,
          centerId: updated.centerId,
          actorUserId: userId,
          action: "meal_post.published",
          entityType: "meal_post",
          entityId: updated.id,
        },
        tx,
      );
      return updated;
    });
    return mealPostDetailSchema.parse(this.toDetail(meal, userId));
  }

  async unpublish(userId: string, mealId: string) {
    const existing = await this.findMeal(mealId);
    await this.requireManageMeal(userId, existing);
    const meal = await this.prisma.mealPost.update({
      where: { id: mealId },
      data: { status: "draft", publishedAt: null },
      include: mealInclude,
    });
    return mealPostDetailSchema.parse(this.toDetail(meal, userId));
  }

  async delete(userId: string, mealId: string) {
    const existing = await this.findMeal(mealId);
    await this.requireManageMeal(userId, existing);
    await this.prisma.mealPost.update({
      where: { id: mealId },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      organizationId: existing.center.organizationId,
      centerId: existing.centerId,
      actorUserId: userId,
      action: "meal_post.deleted",
      entityType: "meal_post",
      entityId: mealId,
    });
    return { success: true };
  }

  async setChildStatuses(
    userId: string,
    mealId: string,
    statuses: MealChildStatusInput[],
  ) {
    const existing = await this.findMeal(mealId);
    await this.requireManageMeal(userId, existing);
    const classIds = await this.audienceClassIds(existing);
    await this.validateChildStatuses(existing.centerId, classIds, statuses);
    const meal = await this.prisma.$transaction(async (tx) => {
      await tx.mealChildStatus.deleteMany({ where: { mealPostId: mealId } });
      await tx.mealChildStatus.createMany({
        data: statuses.map((status) => ({
          mealPostId: mealId,
          childId: status.childId,
          status: status.status,
          note: emptyToNull(status.note),
          recordedByUserId: userId,
        })),
      });
      await this.audit.log(
        {
          organizationId: existing.center.organizationId,
          centerId: existing.centerId,
          actorUserId: userId,
          action: "meal_post.child_statuses_updated",
          entityType: "meal_post",
          entityId: mealId,
        },
        tx,
      );
      return tx.mealPost.findUniqueOrThrow({
        where: { id: mealId },
        include: mealInclude,
      });
    });
    return mealPostDetailSchema.parse(this.toDetail(meal, userId));
  }

  private async validateMealInput(
    userId: string,
    centerId: string,
    input: CreateMealPostInput,
  ) {
    const scope = await this.requireStaffScope(userId, centerId);
    if (input.audienceType === "center" && !scope.director) {
      throw new ForbiddenException("Only directors can create center meals.");
    }
    const classIds = unique(input.classIds);
    if (input.audienceType === "class" && classIds.length === 0) {
      throw new BadRequestException("Choose at least one class.");
    }
    if (!scope.director && classIds.some((id) => !scope.classIds.includes(id))) {
      throw new ForbiddenException("You can only use assigned classes.");
    }
    if (classIds.length > 0) {
      const count = await this.prisma.class.count({
        where: { id: { in: classIds }, centerId, status: "active" },
      });
      if (count !== classIds.length) {
        throw new BadRequestException("One or more classes were not found.");
      }
    }
    const mediaIds = unique(input.mediaAssetIds);
    if (mediaIds.length > 0) {
      const mediaCount = await this.prisma.mediaAsset.count({
        where: { id: { in: mediaIds }, centerId },
      });
      if (mediaCount !== mediaIds.length) {
        throw new BadRequestException("One or more media assets were not found.");
      }
    }
    const audienceClasses =
      input.audienceType === "center"
        ? (
            await this.prisma.class.findMany({
              where: { centerId, status: "active" },
              select: { id: true },
            })
          ).map((item) => item.id)
        : classIds;
    await this.validateChildStatuses(
      centerId,
      audienceClasses,
      input.childStatuses,
    );
  }

  private async validateChildStatuses(
    centerId: string,
    classIds: string[],
    statuses: MealChildStatusInput[],
  ) {
    const childIds = unique(statuses.map((item) => item.childId));
    if (childIds.length === 0) return;
    const count = await this.prisma.childEnrollment.count({
      where: {
        centerId,
        enrollmentStatus: "active",
        classId: { in: classIds },
        childId: { in: childIds },
      },
    });
    if (count !== childIds.length) {
      throw new BadRequestException(
        "One or more children are outside the meal audience.",
      );
    }
  }

  private async findMeal(mealId: string) {
    const meal = await this.prisma.mealPost.findFirst({
      where: { id: mealId, deletedAt: null },
      include: mealInclude,
    });
    if (!meal) throw new NotFoundException("Meal not found.");
    return meal;
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
      throw new ForbiddenException("You cannot manage meals for this center.");
    }
    return {
      director: false,
      classIds: assignments.map((item) => item.classId),
    };
  }

  private async canManageMeal(userId: string, meal: MealPayload) {
    const scope = await this.requireStaffScope(userId, meal.centerId).catch(
      () => null,
    );
    if (!scope) return false;
    if (scope.director || meal.authorUserId === userId) return true;
    const classIds = await this.audienceClassIds(meal);
    return classIds.some((id) => scope.classIds.includes(id));
  }

  private async requireManageMeal(userId: string, meal: MealPayload) {
    if (!(await this.canManageMeal(userId, meal))) {
      throw new ForbiddenException("You cannot manage this meal.");
    }
  }

  private async canViewMeal(userId: string, meal: MealPayload) {
    if (await this.canManageMeal(userId, meal)) return true;
    if (meal.status !== "published") return false;
    const access = await this.parentAccess(userId).catch(() => null);
    if (!access) return false;
    if (meal.audienceType === "center") {
      return access.centerIds.includes(meal.centerId);
    }
    return meal.classes.some((item) => access.classIds.includes(item.classId));
  }

  private async parentAccess(userId: string, childId?: string) {
    const guardians = await this.prisma.childGuardian.findMany({
      where: { userId, ...(childId ? { childId } : {}) },
      include: {
        child: {
          include: {
            childEnrollments: {
              where: { enrollmentStatus: "active" },
              select: { centerId: true, childId: true, classId: true },
            },
          },
        },
      },
    });
    if (guardians.length === 0) {
      throw new ForbiddenException("No linked children found.");
    }
    const childIds = guardians.map((item) => item.childId);
    const enrollments = guardians.flatMap((item) => item.child.childEnrollments);
    return {
      childIds,
      centerIds: unique(enrollments.map((item) => item.centerId)),
      classIds: unique(
        enrollments
          .map((item) => item.classId)
          .filter((id): id is string => Boolean(id)),
      ),
    };
  }

  private async audienceClassIds(meal: MealPayload) {
    if (meal.audienceType === "class") {
      return meal.classes.map((item) => item.classId);
    }
    const classes = await this.prisma.class.findMany({
      where: { centerId: meal.centerId, status: "active" },
      select: { id: true },
    });
    return classes.map((item) => item.id);
  }

  private async notifyPublished(tx: Tx, mealId: string) {
    const meal = await tx.mealPost.findUnique({
      where: { id: mealId },
      include: { classes: true },
    });
    if (!meal) return;
    const guardians = await tx.childGuardian.findMany({
      where:
        meal.audienceType === "center"
          ? {
              child: {
                childEnrollments: {
                  some: {
                    centerId: meal.centerId,
                    enrollmentStatus: "active",
                  },
                },
              },
            }
          : {
              child: {
                childEnrollments: {
                  some: {
                    enrollmentStatus: "active",
                    classId: { in: meal.classes.map((item) => item.classId) },
                  },
                },
              },
            },
      select: { userId: true },
    });
    await Promise.all(
      unique(guardians.map((item) => item.userId)).map((userId) =>
        this.notifications.enqueue(
          {
            userId,
            notificationType: "meal_post.published",
            title: "Today's meal menu",
            body: meal.menuText.slice(0, 120),
            entityType: "meal_post",
            entityId: meal.id,
            channels: ["in_app", "push"],
          },
          tx,
        ),
      ),
    );
  }

  private toSummary(
    meal: MealPayload,
    userId: string,
    visibleChildIds?: string[],
  ) {
    const media = meal.media.map(toMedia);
    const childStatuses = this.visibleStatuses(meal, visibleChildIds);
    return {
      id: meal.id,
      centerId: meal.centerId,
      centerName: meal.center.name,
      author: meal.authorUser,
      mealDate: toIsoDate(meal.mealDate),
      mealType: meal.mealType,
      audienceType: meal.audienceType,
      classes: meal.classes.map((item) => item.class),
      menuText: meal.menuText,
      allergyNote: meal.allergyNote,
      status: meal.status,
      coverMedia: media[0] ?? null,
      mediaCount: media.length,
      childStatusCount: meal.childStatuses.length,
      myChildStatuses: visibleChildIds ? childStatuses : undefined,
      publishedAt: meal.publishedAt?.toISOString() ?? null,
      updatedAt: meal.updatedAt.toISOString(),
    };
  }

  private toDetail(
    meal: MealPayload,
    userId: string,
    visibleChildIds?: string[],
  ) {
    return {
      ...this.toSummary(meal, userId, visibleChildIds),
      media: meal.media.map(toMedia),
      childStatuses: this.visibleStatuses(meal, visibleChildIds),
    };
  }

  private visibleStatuses(meal: MealPayload, visibleChildIds?: string[]) {
    return meal.childStatuses
      .filter((status) =>
        visibleChildIds ? visibleChildIds.includes(status.childId) : true,
      )
      .map((status) => ({
        id: status.id,
        child: toChild(status.child),
        status: status.status,
        note: status.note,
        recordedByUserId: status.recordedByUserId,
        recordedAt: status.recordedAt.toISOString(),
        updatedAt: status.updatedAt.toISOString(),
      }));
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function emptyToNull(value?: string | null) {
  const cleaned = clean(value);
  return cleaned ? cleaned : null;
}

function childName(child: { firstName: string; lastName: string | null }) {
  return [child.firstName, child.lastName].filter(Boolean).join(" ");
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toChild(child: MealPayload["childStatuses"][number]["child"]) {
  const enrollment = child.childEnrollments[0];
  return {
    id: child.id,
    name: childName(child),
    classId: enrollment?.classId ?? null,
    className: enrollment?.class?.name ?? null,
  };
}

function toMedia(item: MealPayload["media"][number]) {
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
