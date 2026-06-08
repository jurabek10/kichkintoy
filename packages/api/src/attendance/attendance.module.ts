import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AttendanceService } from "./attendance.service";

@Module({
  imports: [AuditModule, DatabaseModule, NotificationsModule],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
