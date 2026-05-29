import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CentersModule } from "./centers/centers.module";
import { DatabaseModule } from "./database/database.module";
import { DirectorModule } from "./director/director.module";
import { GeoModule } from "./geo/geo.module";
import { MembershipsModule } from "./memberships/memberships.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { TeacherModule } from "./teacher/teacher.module";

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    MembershipsModule,
    NotificationsModule,
    AuthModule,
    CentersModule,
    GeoModule,
    DirectorModule,
    TeacherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
