import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ReportsService } from "./reports.service";

@Module({
  imports: [AuthModule],
  providers: [ReportsService],
})
export class ReportsModule {}
