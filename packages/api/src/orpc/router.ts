import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { RPCHandler } from "@orpc/server/node";
import { implement, onError } from "@orpc/server";
import { appContract } from "@kichkintoy/shared";
import { AlbumsService } from "../albums/albums.service";
import { AttendanceService } from "../attendance/attendance.service";
import { AuthService } from "../auth/auth.service";
import { CalendarService } from "../calendar/calendar.service";
import { CentersService } from "../centers/centers.service";
import { ClassService } from "../director/class.service";
import { DirectorService } from "../director/director.service";
import { GeoService } from "../geo/geo.service";
import { MediaService } from "../media/media.service";
import { MedicationsService } from "../medications/medications.service";
import { MealsService } from "../meals/meals.service";
import { NoticesService } from "../notices/notices.service";
import { NotificationsQueryService } from "../notifications/notifications-query.service";
import { PickupsService } from "../pickups/pickups.service";
import { PrismaService } from "../database/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ReportsService } from "../reports/reports.service";
import { StudentDocumentsService } from "../student-documents/student-documents.service";
import { TeacherService } from "../teacher/teacher.service";
import type { ORPCContext, ORPCDeps } from "./context";
import { rpcRateLimit } from "./rate-limit";
import { createAlbumsRouter } from "./routers/albums.router";
import { createAttendanceRouter } from "./routers/attendance.router";
import { createAuthRouter } from "./routers/auth.router";
import { createCalendarRouter } from "./routers/calendar.router";
import {
  createCentersRouter,
  createGeoRouter,
  createTeacherRouter,
} from "./routers/catalog.router";
import { createDirectorRouter } from "./routers/director.router";
import { createMediaRouter } from "./routers/media.router";
import { createMedicationsRouter } from "./routers/medications.router";
import { createMealsRouter } from "./routers/meals.router";
import { createNoticesRouter } from "./routers/notices.router";
import { createNotificationsRouter } from "./routers/notifications.router";
import { createPickupsRouter } from "./routers/pickups.router";
import { createRealtimeRouter } from "./routers/realtime.router";
import { createReportsRouter } from "./routers/reports.router";
import { createStudentDocumentsRouter } from "./routers/student-documents.router";

export function registerORPCRoutes(app: NestExpressApplication) {
  const router = createORPCRouter({
    authService: app.get(AuthService, { strict: false }),
    attendanceService: app.get(AttendanceService, { strict: false }),
    albumsService: app.get(AlbumsService, { strict: false }),
    calendarService: app.get(CalendarService, { strict: false }),
    centersService: app.get(CentersService, { strict: false }),
    classService: app.get(ClassService, { strict: false }),
    directorService: app.get(DirectorService, { strict: false }),
    geoService: app.get(GeoService, { strict: false }),
    mediaService: app.get(MediaService, { strict: false }),
    medicationsService: app.get(MedicationsService, { strict: false }),
    mealsService: app.get(MealsService, { strict: false }),
    noticesService: app.get(NoticesService, { strict: false }),
    notificationsQueryService: app.get(NotificationsQueryService, {
      strict: false,
    }),
    pickupsService: app.get(PickupsService, { strict: false }),
    prisma: app.get(PrismaService, { strict: false }),
    realtimeService: app.get(RealtimeService, { strict: false }),
    reportsService: app.get(ReportsService, { strict: false }),
    studentDocumentsService: app.get(StudentDocumentsService, { strict: false }),
    teacherService: app.get(TeacherService, { strict: false }),
  });

  const handler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        // Keep the server log useful while the client receives a normalized error.
        console.error(error);
      }),
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
    auth: createAuthRouter(os, deps),
    attendance: createAttendanceRouter(os, deps),
    albums: createAlbumsRouter(os, deps),
    calendar: createCalendarRouter(os, deps),
    geo: createGeoRouter(os, deps),
    centers: createCentersRouter(os, deps),
    teacher: createTeacherRouter(os, deps),
    director: createDirectorRouter(os, deps),
    media: createMediaRouter(os, deps),
    medications: createMedicationsRouter(os, deps),
    meals: createMealsRouter(os, deps),
    reports: createReportsRouter(os, deps),
    studentDocuments: createStudentDocumentsRouter(os, deps),
    notices: createNoticesRouter(os, deps),
    notifications: createNotificationsRouter(os, deps),
    pickups: createPickupsRouter(os, deps),
    realtime: createRealtimeRouter(os, deps),
  });
}
