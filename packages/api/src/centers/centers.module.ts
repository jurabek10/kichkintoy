import { Module } from "@nestjs/common";
import { CentersService } from "./centers.service";

@Module({
  providers: [CentersService],
  exports: [CentersService],
})
export class CentersModule {}
