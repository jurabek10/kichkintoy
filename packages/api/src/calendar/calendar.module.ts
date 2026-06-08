import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CalendarService } from "./calendar.service";

@Module({
  imports: [AuditModule, DatabaseModule, NotificationsModule],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
