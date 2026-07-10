import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminService } from "./admin.service";

@Module({
  imports: [DatabaseModule, AuditModule, NotificationsModule],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
