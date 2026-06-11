import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { MediaModule } from "../media/media.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SpecialClassesService } from "./special-classes.service";

@Module({
  imports: [AuditModule, DatabaseModule, MediaModule, NotificationsModule],
  providers: [SpecialClassesService],
  exports: [SpecialClassesService],
})
export class SpecialClassesModule {}
