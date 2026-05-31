import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { RPCHandler } from "@orpc/server/node";
import { implement, onError } from "@orpc/server";
import { appContract } from "@kichkintoy/shared";
import { AuthService } from "../auth/auth.service";
import { CentersService } from "../centers/centers.service";
import { ClassService } from "../director/class.service";
import { DirectorService } from "../director/director.service";
import { GeoService } from "../geo/geo.service";
import { PrismaService } from "../database/prisma.service";
import { ReportsService } from "../reports/reports.service";
import { TeacherService } from "../teacher/teacher.service";
import type { ORPCContext, ORPCDeps } from "./context";
import { rpcRateLimit } from "./rate-limit";
import { createAuthRouter } from "./routers/auth.router";
import {
  createCentersRouter,
  createGeoRouter,
  createTeacherRouter,
} from "./routers/catalog.router";
import { createDirectorRouter } from "./routers/director.router";
import { createReportsRouter } from "./routers/reports.router";

export function registerORPCRoutes(app: NestExpressApplication) {
  const router = createORPCRouter({
    authService: app.get(AuthService, { strict: false }),
    centersService: app.get(CentersService, { strict: false }),
    classService: app.get(ClassService, { strict: false }),
    directorService: app.get(DirectorService, { strict: false }),
    geoService: app.get(GeoService, { strict: false }),
    prisma: app.get(PrismaService, { strict: false }),
    reportsService: app.get(ReportsService, { strict: false }),
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
    geo: createGeoRouter(os, deps),
    centers: createCentersRouter(os, deps),
    teacher: createTeacherRouter(os, deps),
    director: createDirectorRouter(os, deps),
    reports: createReportsRouter(os, deps),
  });
}
