import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  appLanguageSchema,
  notificationSettingsSchema,
  profileViewSchema,
  type NotificationSettings,
  type ProfileView,
  type UpdateNotificationSettingsInput,
  type UpdateProfileInput,
  type UserRole,
} from "@kichkintoy/shared";
import { PrismaService } from "../database/prisma.service";

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
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const centerRole =
      user.userRoles.find((r) => r.centerId && r.center) ?? null;

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
    });
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
