import { Module } from "@nestjs/common";
import { FamilyModule } from "../family/family.module";
import { TelegramAuthService } from "./telegram-auth.service";
import { TelegramController } from "./telegram.controller";
@Module({ imports: [FamilyModule], controllers: [TelegramController], providers: [TelegramAuthService], exports: [TelegramAuthService] })
export class TelegramModule {}
