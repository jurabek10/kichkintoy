import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { RPCHandler } from "@orpc/server/node";
import { implement } from "@orpc/server";
import { toORPCError } from "./error-mapping";
import { appContract } from "@kichkintoy/shared";
import { AdminService } from "../admin/admin.service";
import { AlbumsService } from "../albums/albums.service";
import { AttendanceService } from "../attendance/attendance.service";
import { AuthService } from "../auth/auth.service";
import { CalendarService } from "../calendar/calendar.service";
import { CentersService } from "../centers/centers.service";
import { ChatService } from "../chat/chat.service";
import { ClassService } from "../director/class.service";
import { DirectorService } from "../director/director.service";
import { GeoService } from "../geo/geo.service";
import { FamilyService } from "../family/family.service";
import { TelegramAuthService } from "../telegram/telegram-auth.service";
import { MediaService } from "../media/media.service";
import { MedicationsService } from "../medications/medications.service";
import { MealsService } from "../meals/meals.service";
import { MessagesService } from "../messages/messages.service";
import { ComplaintsService } from "../complaints/complaints.service";
import { NoticesService } from "../notices/notices.service";
import { NotificationsQueryService } from "../notifications/notifications-query.service";
import { PaymentsService } from "../payments/payments.service";
import { PickupsService } from "../pickups/pickups.service";
import { PrismaService } from "../database/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ProfileService } from "../profile/profile.service";
import { GeminiService } from "../reports/gemini.service";
import { ReportsService } from "../reports/reports.service";
import { StudentDocumentsService } from "../student-documents/student-documents.service";
import { TeacherService } from "../teacher/teacher.service";
import type { ORPCContext, ORPCDeps } from "./context";
import { rpcRateLimit } from "./rate-limit";
import { createAdminRouter } from "../admin/admin.router";
import { createAlbumsRouter } from "../albums/albums.router";
import { createAttendanceRouter } from "../attendance/attendance.router";
import { createAuthRouter } from "../auth/auth.router";
import { createCalendarRouter } from "../calendar/calendar.router";
import { createCentersRouter } from "../centers/centers.router";
import { createChatRouter } from "../chat/chat.router";
import { createGeoRouter } from "../geo/geo.router";
import { createFamilyRouter } from "../family/family.router";
import { createTeacherRouter } from "../teacher/teacher.router";
import { createDirectorRouter } from "../director/director.router";
import { createMediaRouter } from "../media/media.router";
import { createMedicationsRouter } from "../medications/medications.router";
import { createMealsRouter } from "../meals/meals.router";
import { createMessagesRouter } from "../messages/messages.router";
import { createComplaintsRouter } from "../complaints/complaints.router";
import { createNoticesRouter } from "../notices/notices.router";
import { createNotificationsRouter } from "../notifications/notifications.router";
import { createPaymentsRouter } from "../payments/payments.router";
import { createPickupsRouter } from "../pickups/pickups.router";
import { createProfileRouter } from "../profile/profile.router";
import { createRealtimeRouter } from "../realtime/realtime.router";
import { createReportsRouter } from "../reports/reports.router";
import { createStudentDocumentsRouter } from "../student-documents/student-documents.router";

export function registerORPCRoutes(app: NestExpressApplication) {
  const router = createORPCRouter({
    adminService: app.get(AdminService, { strict: false }),
    authService: app.get(AuthService, { strict: false }),
    attendanceService: app.get(AttendanceService, { strict: false }),
    albumsService: app.get(AlbumsService, { strict: false }),
    calendarService: app.get(CalendarService, { strict: false }),
    centersService: app.get(CentersService, { strict: false }),
    chatService: app.get(ChatService, { strict: false }),
    classService: app.get(ClassService, { strict: false }),
    directorService: app.get(DirectorService, { strict: false }),
    geoService: app.get(GeoService, { strict: false }),
    familyService: app.get(FamilyService, { strict: false }),
    telegramAuthService: app.get(TelegramAuthService, { strict: false }),
    mediaService: app.get(MediaService, { strict: false }),
    medicationsService: app.get(MedicationsService, { strict: false }),
    mealsService: app.get(MealsService, { strict: false }),
    messagesService: app.get(MessagesService, { strict: false }),
    complaintsService: app.get(ComplaintsService, { strict: false }),
    noticesService: app.get(NoticesService, { strict: false }),
    notificationsQueryService: app.get(NotificationsQueryService, {
      strict: false,
    }),
    paymentsService: app.get(PaymentsService, { strict: false }),
    pickupsService: app.get(PickupsService, { strict: false }),
    profileService: app.get(ProfileService, { strict: false }),
    prisma: app.get(PrismaService, { strict: false }),
    realtimeService: app.get(RealtimeService, { strict: false }),
    reportsService: app.get(ReportsService, { strict: false }),
    geminiService: app.get(GeminiService, { strict: false }),
    studentDocumentsService: app.get(StudentDocumentsService, { strict: false }),
    teacherService: app.get(TeacherService, { strict: false }),
  });

  const handler = new RPCHandler(router, {
    interceptors: [
      async (options) => {
        try {
          return await options.next();
        } catch (error) {
          // Log the original for the server, hand the client a normalized error
          // that preserves status/message and a translatable code.
          console.error(error);
          throw toORPCError(error);
        }
      },
    ],
  });

  app.use(
    "/rpc{/*path}",
    rpcRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
      const { matched } = await handler.handle(req, res, {
        prefix: "/rpc",
        context: { req },
      });

      if (matched) return;
      next();
    },
  );
}

function createORPCRouter(deps: ORPCDeps) {
  const os = implement<typeof appContract, ORPCContext>(appContract);

  return os.router({
    admin: createAdminRouter(os, deps),
    auth: createAuthRouter(os, deps),
    family: createFamilyRouter(os, deps),
    attendance: createAttendanceRouter(os, deps),
    albums: createAlbumsRouter(os, deps),
    calendar: createCalendarRouter(os, deps),
    chat: createChatRouter(os, deps),
    geo: createGeoRouter(os, deps),
    centers: createCentersRouter(os, deps),
    teacher: createTeacherRouter(os, deps),
    director: createDirectorRouter(os, deps),
    media: createMediaRouter(os, deps),
    medications: createMedicationsRouter(os, deps),
    meals: createMealsRouter(os, deps),
    messages: createMessagesRouter(os, deps),
    complaints: createComplaintsRouter(os, deps),
    reports: createReportsRouter(os, deps),
    studentDocuments: createStudentDocumentsRouter(os, deps),
    notices: createNoticesRouter(os, deps),
    notifications: createNotificationsRouter(os, deps),
    payments: createPaymentsRouter(os, deps),
    pickups: createPickupsRouter(os, deps),
    profile: createProfileRouter(os, deps),
    realtime: createRealtimeRouter(os, deps),
  });
}
