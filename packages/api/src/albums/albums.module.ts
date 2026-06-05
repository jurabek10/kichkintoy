import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AlbumsService } from "./albums.service";

@Module({
  imports: [AuditModule, DatabaseModule, NotificationsModule],
  providers: [AlbumsService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
