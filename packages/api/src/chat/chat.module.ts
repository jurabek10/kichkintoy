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
import { DirectorModule } from "../director/director.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatToolsService } from "./chat-tools.service";
import { TeacherChatToolsService } from "./teacher-chat-tools.service";
import { DirectorChatToolsService } from "./director-chat-tools.service";
import { GeminiChatService } from "./gemini-chat.service";
import { OpenAiChatService } from "./openai-chat.service";
import { CHAT_ENGINE, type ChatEngine } from "./chat-engine";

/**
 * Select the chat backend by env. Default is Gemini (unchanged); set
 * CHAT_PROVIDER to any non-"gemini" value (openrouter / groq / ollama / openai)
 * to use the OpenAI-compatible engine with a free model instead. Only the chosen
 * engine is instantiated, so an unused provider's missing key never breaks boot.
 */
const chatEngineProvider = {
  provide: CHAT_ENGINE,
  useFactory: (): ChatEngine => {
    const provider = (process.env.CHAT_PROVIDER ?? "gemini").toLowerCase();
    return provider === "gemini"
      ? new GeminiChatService()
      : new OpenAiChatService();
  },
};

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
    DirectorModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatToolsService,
    TeacherChatToolsService,
    DirectorChatToolsService,
    chatEngineProvider,
  ],
  exports: [ChatService],
})
export class ChatModule {}
