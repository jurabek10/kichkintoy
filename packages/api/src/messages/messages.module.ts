import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MessagesService } from "./messages.service";

@Module({
  imports: [AuditModule, DatabaseModule, NotificationsModule],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
