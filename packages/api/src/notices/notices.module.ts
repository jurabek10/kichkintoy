import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NoticesService } from "./notices.service";

@Module({
  imports: [AuthModule],
  providers: [NoticesService],
  exports: [NoticesService],
})
export class NoticesModule {}
