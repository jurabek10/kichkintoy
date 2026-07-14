import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CronsModule } from "../crons/crons.module";
import { AdminCronService } from "./admin-cron.service";
import { AdminService } from "./admin.service";

@Module({
  imports: [DatabaseModule, AuditModule, NotificationsModule, CronsModule],
  providers: [AdminService, AdminCronService],
  exports: [AdminService, AdminCronService],
})
export class AdminModule {}
