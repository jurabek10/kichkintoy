import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ClickController } from "./click.controller";
import { ClickService } from "./click.service";
import { PaymeController } from "./payme.controller";
import { PaymeService } from "./payme.service";
import { PaymentsService } from "./payments.service";
import { InvoiceMaterializationService } from "./invoice-materialization.service";

@Module({
  imports: [AuditModule, DatabaseModule, NotificationsModule],
  controllers: [PaymeController, ClickController],
  providers: [
    PaymentsService,
    PaymeService,
    ClickService,
    InvoiceMaterializationService,
  ],
  exports: [PaymentsService, InvoiceMaterializationService],
})
export class PaymentsModule {}
