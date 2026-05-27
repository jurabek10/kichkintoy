import { Global, Module } from "@nestjs/common";
import { EskizSmsService } from "../auth/eskiz-sms.service";
import { NotificationsService } from "./notifications.service";

@Global()
@Module({
  providers: [NotificationsService, EskizSmsService],
  exports: [NotificationsService, EskizSmsService],
})
export class NotificationsModule {}
