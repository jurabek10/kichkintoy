import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EskizSmsService } from "./eskiz-sms.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, EskizSmsService],
})
export class AuthModule {}
