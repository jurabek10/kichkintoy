import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MealsService } from "./meals.service";

@Module({
  imports: [AuditModule, DatabaseModule, NotificationsModule],
  providers: [MealsService],
  exports: [MealsService],
})
export class MealsModule {}
