import { Global, Module } from "@nestjs/common";
import { EskizSmsService } from "../auth/eskiz-sms.service";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationsQueryService } from "./notifications-query.service";
import { NotificationsService } from "./notifications.service";

@Global()
@Module({
  imports: [RealtimeModule],
  providers: [NotificationsService, NotificationsQueryService, EskizSmsService],
  exports: [NotificationsService, NotificationsQueryService, EskizSmsService],
})
export class NotificationsModule {}
