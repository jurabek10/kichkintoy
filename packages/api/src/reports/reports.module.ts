import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GeminiService } from "./gemini.service";
import { ReportsService } from "./reports.service";

@Module({
  imports: [AuthModule],
  providers: [ReportsService, GeminiService],
  exports: [ReportsService],
})
export class ReportsModule {}
