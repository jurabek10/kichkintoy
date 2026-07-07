import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TeacherService } from "./teacher.service";

@Module({
  imports: [AuthModule],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}
