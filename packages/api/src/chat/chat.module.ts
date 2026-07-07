import { Module } from "@nestjs/common";
import { AlbumsModule } from "../albums/albums.module";
import { AttendanceModule } from "../attendance/attendance.module";
import { AuthModule } from "../auth/auth.module";
import { CalendarModule } from "../calendar/calendar.module";
import { MealsModule } from "../meals/meals.module";
import { MedicationsModule } from "../medications/medications.module";
import { NoticesModule } from "../notices/notices.module";
import { PickupsModule } from "../pickups/pickups.module";
import { ProfileModule } from "../profile/profile.module";
import { ReportsModule } from "../reports/reports.module";
import { StudentDocumentsModule } from "../student-documents/student-documents.module";
import { TeacherModule } from "../teacher/teacher.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatToolsService } from "./chat-tools.service";
import { TeacherChatToolsService } from "./teacher-chat-tools.service";
import { GeminiChatService } from "./gemini-chat.service";

@Module({
  imports: [
    AuthModule,
    ProfileModule,
    ReportsModule,
    AttendanceModule,
    NoticesModule,
    CalendarModule,
    MealsModule,
    MedicationsModule,
    AlbumsModule,
    PickupsModule,
    StudentDocumentsModule,
    TeacherModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatToolsService,
    TeacherChatToolsService,
    GeminiChatService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
