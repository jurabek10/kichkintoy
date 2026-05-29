import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TeacherController } from "./teacher.controller";
import { TeacherService } from "./teacher.service";

@Module({
  imports: [AuthModule],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
