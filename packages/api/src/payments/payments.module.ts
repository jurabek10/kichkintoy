import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ClickController } from "./click.controller";
import { ClickService } from "./click.service";
import { PaymeController } from "./payme.controller";
import { PaymeService } from "./payme.service";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuditModule, DatabaseModule, NotificationsModule],
  controllers: [PaymeController, ClickController],
  providers: [PaymentsService, PaymeService, ClickService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
