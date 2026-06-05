import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { MediaService } from "./media.service";
import { MinioStorageService } from "./minio-storage.service";

@Module({
  imports: [AuditModule, DatabaseModule],
  providers: [MediaService, MinioStorageService],
  exports: [MediaService],
})
export class MediaModule {}
