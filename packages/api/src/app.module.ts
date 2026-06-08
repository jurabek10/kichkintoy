import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuditModule } from "./audit/audit.module";
import { AlbumsModule } from "./albums/albums.module";
import { AuthModule } from "./auth/auth.module";
import { CentersModule } from "./centers/centers.module";
import { DatabaseModule } from "./database/database.module";
import { DirectorModule } from "./director/director.module";
import { GeoModule } from "./geo/geo.module";
import { MediaModule } from "./media/media.module";
import { MedicationsModule } from "./medications/medications.module";
import { MealsModule } from "./meals/meals.module";
import { MembershipsModule } from "./memberships/memberships.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { NoticesModule } from "./notices/notices.module";
import { PickupsModule } from "./pickups/pickups.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { ReportsModule } from "./reports/reports.module";
import { TeacherModule } from "./teacher/teacher.module";

@Module({
  imports: [
    // Global IP-based rate limiting. In-memory store (per-instance) is fine for
    // a single-node MVP; swap to a Redis ThrottlerStorage when scaling out.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute window
        limit: 100, // default cap per IP per window
      },
    ]),
    DatabaseModule,
    AuditModule,
    AttendanceModule,
    AlbumsModule,
    MembershipsModule,
    MediaModule,
    MedicationsModule,
    MealsModule,
    NotificationsModule,
    NoticesModule,
    PickupsModule,
    RealtimeModule,
    AuthModule,
    CentersModule,
    GeoModule,
    DirectorModule,
    TeacherModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply the throttler to every route by default; tighten per-route with @Throttle.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
