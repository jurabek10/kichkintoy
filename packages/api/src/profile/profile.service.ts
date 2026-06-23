import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  appLanguageSchema,
  childGenderValues,
  notificationSettingsSchema,
  parentChildSchema,
  profileViewSchema,
  type NotificationSettings,
  type ParentChild,
  type ProfileView,
  type UpdateChildRequest,
  type UpdateNotificationSettingsInput,
  type UpdateProfileInput,
  type UserRole,
} from "@kichkintoy/shared";
import { PrismaService } from "../database/prisma.service";

const CHILD_GENDERS = new Set<string>(childGenderValues);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<ProfileView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true, center: true } },
        userNotificationSettings: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const centerRole =
      user.userRoles.find((r) => r.centerId && r.center) ?? null;
    const role = primaryRole(user.userRoles);

    return profileViewSchema.parse({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      username: user.username,
      role: primaryRole(user.userRoles),
      centerId: centerRole?.centerId ?? null,
      centerName: centerRole?.center?.name ?? null,
      preferredLanguage: toAppLanguage(user.preferredLanguage),
      avatarMediaAssetId: toMediaAssetId(user.avatarUrl),
      notificationSettings: toNotificationSettings(
        user.userNotificationSettings,
      ),
      teacher:
        role === "teacher"
          ? {
              employeeNumber: user.teacherProfile?.employeeNumber ?? null,
              bio: user.teacherProfile?.bio ?? null,
            }
          : null,
    });
  }

  async updateTeacherProfile(
    userId: string,
    bio: string | null,
  ): Promise<ProfileView> {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new BadRequestException("This account is not a teacher.");
    }

    await this.prisma.teacherProfile.update({
      where: { userId },
      data: { bio: bio?.trim() ? bio.trim() : null },
    });

    return this.get(userId);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<ProfileView> {
    const username = input.username.trim().toLowerCase();
    const email = input.email ? input.email.trim() : null;

    const usernameTaken = await this.prisma.user.findFirst({
      where: { username, id: { not: userId } },
      select: { id: true },
    });
    if (usernameTaken) {
      throw new ConflictException("That username is already taken.");
    }

    if (email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true },
      });
      if (emailTaken) {
        throw new ConflictException("That email is already in use.");
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName.trim(),
        username,
        email,
        preferredLanguage: input.preferredLanguage,
      },
    });

    return this.get(userId);
  }

  async updateAvatar(
    userId: string,
    mediaAssetId: string,
  ): Promise<ProfileView> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      select: { id: true, uploaderUserId: true, fileUrl: true },
    });

    if (!asset || asset.uploaderUserId !== userId) {
      throw new NotFoundException("Avatar image not found.");
    }

    if (purposeFromObjectKey(asset.fileUrl) !== "user_avatar") {
      throw new BadRequestException("That file cannot be used as an avatar.");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: mediaAssetId },
    });

    return this.get(userId);
  }

  async removeAvatar(userId: string): Promise<ProfileView> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
    return this.get(userId);
  }

  async updateNotificationSettings(
    userId: string,
    input: UpdateNotificationSettingsInput,
  ): Promise<NotificationSettings> {
    const data = {
      pushEnabled: input.pushEnabled,
      smsEnabled: input.smsEnabled,
      quietHoursStart: parseTime(input.quietHoursStart),
      quietHoursEnd: parseTime(input.quietHoursEnd),
    };

    const settings = await this.prisma.userNotificationSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return toNotificationSettings(settings);
  }

  // --- Parent: children ---

  async listChildren(userId: string): Promise<ParentChild[]> {
    const guardians = await this.prisma.childGuardian.findMany({
      where: { userId },
      include: { child: { include: ENROLLMENT_INCLUDE } },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return guardians.map((guardian) =>
      toParentChild(guardian.child, guardian.relationship, guardian.isPrimary),
    );
  }

  async updateChild(
    userId: string,
    childId: string,
    input: UpdateChildRequest,
  ): Promise<ParentChild> {
    await this.requireGuardian(userId, childId);

    await this.prisma.child.update({
      where: { id: childId },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() || null,
        dob: new Date(input.dateOfBirth),
        gender: input.gender,
        allergies: input.allergies?.trim() || null,
        medicalNotes: input.medicalNotes?.trim() || null,
      },
    });

    return this.getGuardedChild(userId, childId);
  }

  async updateChildPhoto(
    userId: string,
    childId: string,
    mediaAssetId: string,
  ): Promise<ParentChild> {
    await this.requireGuardian(userId, childId);

    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      select: { id: true, uploaderUserId: true, fileUrl: true },
    });

    if (!asset || asset.uploaderUserId !== userId) {
      throw new NotFoundException("Photo not found.");
    }
    if (purposeFromObjectKey(asset.fileUrl) !== "child_profile") {
      throw new BadRequestException("That file cannot be used as a photo.");
    }

    await this.prisma.child.update({
      where: { id: childId },
      data: { photoUrl: mediaAssetId },
    });

    return this.getGuardedChild(userId, childId);
  }

  async removeChildPhoto(
    userId: string,
    childId: string,
  ): Promise<ParentChild> {
    await this.requireGuardian(userId, childId);
    await this.prisma.child.update({
      where: { id: childId },
      data: { photoUrl: null },
    });
    return this.getGuardedChild(userId, childId);
  }

  private async requireGuardian(userId: string, childId: string) {
    const guardian = await this.prisma.childGuardian.findUnique({
      where: { childId_userId: { childId, userId } },
      select: { id: true },
    });
    if (!guardian) {
      throw new ForbiddenException("You are not a guardian of this child.");
    }
  }

  private async getGuardedChild(
    userId: string,
    childId: string,
  ): Promise<ParentChild> {
    const guardian = await this.prisma.childGuardian.findUnique({
      where: { childId_userId: { childId, userId } },
      include: { child: { include: ENROLLMENT_INCLUDE } },
    });
    if (!guardian) {
      throw new ForbiddenException("You are not a guardian of this child.");
    }
    return toParentChild(
      guardian.child,
      guardian.relationship,
      guardian.isPrimary,
    );
  }
}

const ENROLLMENT_INCLUDE = {
  childEnrollments: {
    where: { enrollmentStatus: "active" as const },
    include: { class: true, center: true },
    orderBy: { startedAt: "desc" as const },
    take: 1,
  },
} as const;

type GuardedChild = {
  id: string;
  firstName: string;
  lastName: string | null;
  dob: Date;
  gender: string | null;
  photoUrl: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  childEnrollments: Array<{
    centerId: string;
    class: { name: string } | null;
    center: { name: string } | null;
  }>;
};

function toParentChild(
  child: GuardedChild,
  relationship: string | null,
  isPrimary: boolean,
): ParentChild {
  const enrollment = child.childEnrollments[0] ?? null;
  const fullName = [child.firstName, child.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return parentChildSchema.parse({
    id: child.id,
    firstName: child.firstName,
    lastName: child.lastName,
    name: fullName || child.firstName,
    dateOfBirth: child.dob.toISOString().slice(0, 10),
    gender: toChildGender(child.gender),
    photoMediaAssetId: toMediaAssetId(child.photoUrl),
    photoUrl: toLegacyPhotoUrl(child.photoUrl),
    allergies: child.allergies,
    medicalNotes: child.medicalNotes,
    centerId: enrollment?.centerId ?? null,
    centerName: enrollment?.center?.name ?? null,
    className: enrollment?.class?.name ?? null,
    relationship,
    isPrimary,
  });
}

function toChildGender(value: string | null) {
  return value && CHILD_GENDERS.has(value) ? value : null;
}

/** A media-asset id is stored as a UUID; anything else is a legacy direct URL. */
function toLegacyPhotoUrl(value: string | null) {
  return value && !UUID_PATTERN.test(value) ? value : null;
}

function primaryRole(
  userRoles: Array<{ role: { name: string } }>,
): UserRole {
  for (const userRole of userRoles) {
    const role = userRole.role.name;
    if (role === "director" || role === "parent" || role === "teacher") {
      return role;
    }
    if (role === "organization_owner") {
      return "director";
    }
  }
  return "director";
}

function toAppLanguage(value: string) {
  const parsed = appLanguageSchema.safeParse(value);
  return parsed.success ? parsed.data : "uz";
}

/** `avatarUrl` holds a media-asset id once set; ignore any legacy/non-id value. */
function toMediaAssetId(value: string | null) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

/** Object keys look like `centers/{centerId}/{purpose}/{assetId}/original.ext`. */
function purposeFromObjectKey(objectKey: string) {
  return objectKey.split("/")[2] ?? null;
}

function toNotificationSettings(
  settings: {
    pushEnabled: boolean;
    smsEnabled: boolean;
    quietHoursStart: Date | null;
    quietHoursEnd: Date | null;
  } | null,
): NotificationSettings {
  return notificationSettingsSchema.parse({
    pushEnabled: settings?.pushEnabled ?? true,
    smsEnabled: settings?.smsEnabled ?? false,
    quietHoursStart: formatTime(settings?.quietHoursStart ?? null),
    quietHoursEnd: formatTime(settings?.quietHoursEnd ?? null),
  });
}

/** Prisma `@db.Time` round-trips as a Date on the 1970-01-01 epoch (UTC). */
function formatTime(value: Date | null) {
  if (!value) return null;
  return value.toISOString().slice(11, 16);
}

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`1970-01-01T${value}:00.000Z`);
}
