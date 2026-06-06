import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MedicationsService } from "./medications.service";

@Module({
  imports: [AuditModule, DatabaseModule, NotificationsModule],
  providers: [MedicationsService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
