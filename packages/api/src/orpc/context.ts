import { HttpStatus } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AppException } from "../common/app-exception";
import type { Request } from "express";
import type { implement } from "@orpc/server";
import type { appContract } from "@kichkintoy/shared";
import type { AuthService, RequestContext } from "../auth/auth.service";
import type { CalendarService } from "../calendar/calendar.service";
import type { AuthenticatedUser } from "../auth/session.guard";
import type { AdminService } from "../admin/admin.service";
import type { AttendanceService } from "../attendance/attendance.service";
import type { AlbumsService } from "../albums/albums.service";
import type { CentersService } from "../centers/centers.service";
import type { ChatService } from "../chat/chat.service";
import type { PrismaService } from "../database/prisma.service";
import type { ClassService } from "../director/class.service";
import type { DirectorAccessLevel } from "../director/director.guard";
import type { DirectorService } from "../director/director.service";
import type { GeoService } from "../geo/geo.service";
import type { FamilyService } from "../family/family.service";
import type { TelegramAuthService } from "../telegram/telegram-auth.service";
import type { MediaService } from "../media/media.service";
import type { MedicationsService } from "../medications/medications.service";
import type { MealsService } from "../meals/meals.service";
import type { MessagesService } from "../messages/messages.service";
import type { ComplaintsService } from "../complaints/complaints.service";
import type { NoticesService } from "../notices/notices.service";
import type { NotificationsQueryService } from "../notifications/notifications-query.service";
import type { PaymentsService } from "../payments/payments.service";
import type { PickupsService } from "../pickups/pickups.service";
import type { ProfileService } from "../profile/profile.service";
import type { RealtimeService } from "../realtime/realtime.service";
import type { GeminiService } from "../reports/gemini.service";
import type { ReportsService } from "../reports/reports.service";
import type { StudentDocumentsService } from "../student-documents/student-documents.service";
import type { TeacherService } from "../teacher/teacher.service";

export type ORPCContext = {
  req: Request;
};

export type ORPCImplementer = ReturnType<
  typeof implement<typeof appContract, ORPCContext>
>;

export type ORPCDeps = {
  adminService: AdminService;
  authService: AuthService;
  attendanceService: AttendanceService;
  albumsService: AlbumsService;
  calendarService: CalendarService;
  centersService: CentersService;
  chatService: ChatService;
  classService: ClassService;
  directorService: DirectorService;
  geoService: GeoService;
  familyService: FamilyService;
  telegramAuthService: TelegramAuthService;
  mediaService: MediaService;
  medicationsService: MedicationsService;
  mealsService: MealsService;
  messagesService: MessagesService;
  complaintsService: ComplaintsService;
  prisma: PrismaService;
  noticesService: NoticesService;
  notificationsQueryService: NotificationsQueryService;
  paymentsService: PaymentsService;
  pickupsService: PickupsService;
  profileService: ProfileService;
  realtimeService: RealtimeService;
  reportsService: ReportsService;
  geminiService: GeminiService;
  studentDocumentsService: StudentDocumentsService;
  teacherService: TeacherService;
};

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
  centerAccess?: DirectorAccessLevel;
};

export function requestContext(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"]?.slice(0, 512) ?? null,
  };
}

export function bearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

export async function requireUser(
  prisma: PrismaService,
  req: Request,
): Promise<AuthenticatedUser> {
  const request = req as RequestWithUser;
  if (request.user) return request.user;

  const token = bearerToken(req);
  if (!token) {
    throw new AppException("AUTH_REQUIRED", HttpStatus.UNAUTHORIZED);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user
  ) {
    throw new AppException("SESSION_EXPIRED", HttpStatus.UNAUTHORIZED);
  }

  request.user = {
    id: session.user.id,
    fullName: session.user.fullName,
    username: session.user.username,
    phoneNumber: session.user.phone,
    roles: session.user.userRoles.map((userRole) => ({
      name: userRole.role.name,
      organizationId: userRole.organizationId,
      centerId: userRole.centerId,
      branchId: userRole.branchId,
    })),
  };

  return request.user;
}

export async function requireCenterAccess(
  prisma: PrismaService,
  req: Request,
  centerId: string,
  options: { directorOnly?: boolean; allowAnyTeacher?: boolean } = {},
): Promise<DirectorAccessLevel> {
  const request = req as RequestWithUser;
  const user = await requireUser(prisma, req);
  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: { id: true, organizationId: true },
  });

  if (!center) {
    throw new AppException("CENTER_NOT_FOUND", HttpStatus.NOT_FOUND);
  }

  const directorMatch = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      role: { name: { in: ["director", "organization_owner"] } },
      OR: [
        { centerId: center.id },
        {
          organizationId: center.organizationId,
          centerId: null,
        },
      ],
    },
  });

  if (directorMatch) {
    request.centerAccess = "director";
    return request.centerAccess;
  }

  if (options.directorOnly) {
    throw new AppException(
      "DIRECTOR_ACCESS_REQUIRED",
      HttpStatus.FORBIDDEN,
    );
  }

  const teacherApprover = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      centerId: center.id,
      canApproveMembers: true,
      role: { name: "teacher" },
    },
  });

  if (teacherApprover) {
    request.centerAccess = "approver_teacher";
    return request.centerAccess;
  }

  // Read-only callers (e.g. viewing join requests) accept any teacher of the
  // center; they just can't act on what they see.
  if (options.allowAnyTeacher) {
    const teacher = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        centerId: center.id,
        role: { name: "teacher" },
      },
    });
    if (teacher) {
      request.centerAccess = "center_teacher";
      return request.centerAccess;
    }
    throw new AppException("CENTER_ACCESS_REQUIRED", HttpStatus.FORBIDDEN);
  }

  throw new AppException("NO_APPROVER_ACCESS", HttpStatus.FORBIDDEN);
}
