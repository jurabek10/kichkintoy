import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Request } from "express";
import type { implement } from "@orpc/server";
import type { appContract } from "@kichkintoy/shared";
import type { AuthService, RequestContext } from "../auth/auth.service";
import type { CalendarService } from "../calendar/calendar.service";
import type { AuthenticatedUser } from "../auth/session.guard";
import type { AttendanceService } from "../attendance/attendance.service";
import type { AlbumsService } from "../albums/albums.service";
import type { CentersService } from "../centers/centers.service";
import type { PrismaService } from "../database/prisma.service";
import type { ClassService } from "../director/class.service";
import type { DirectorAccessLevel } from "../director/director.guard";
import type { DirectorService } from "../director/director.service";
import type { GeoService } from "../geo/geo.service";
import type { MediaService } from "../media/media.service";
import type { MedicationsService } from "../medications/medications.service";
import type { MealsService } from "../meals/meals.service";
import type { NoticesService } from "../notices/notices.service";
import type { NotificationsQueryService } from "../notifications/notifications-query.service";
import type { PickupsService } from "../pickups/pickups.service";
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
  authService: AuthService;
  attendanceService: AttendanceService;
  albumsService: AlbumsService;
  calendarService: CalendarService;
  centersService: CentersService;
  classService: ClassService;
  directorService: DirectorService;
  geoService: GeoService;
  mediaService: MediaService;
  medicationsService: MedicationsService;
  mealsService: MealsService;
  prisma: PrismaService;
  noticesService: NoticesService;
  notificationsQueryService: NotificationsQueryService;
  pickupsService: PickupsService;
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
    throw new UnauthorizedException("Authentication required.");
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
    throw new UnauthorizedException("Session is invalid or expired.");
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
  options: { directorOnly?: boolean } = {},
): Promise<DirectorAccessLevel> {
  const request = req as RequestWithUser;
  const user = await requireUser(prisma, req);
  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: { id: true, organizationId: true },
  });

  if (!center) {
    throw new ForbiddenException("Center not found.");
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
    throw new ForbiddenException(
      "Director access is required for this action.",
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

  throw new ForbiddenException(
    "You do not have approver access to this center.",
  );
}
