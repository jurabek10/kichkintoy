import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DirectorController } from "./director.controller";
import { CenterApproverGuard } from "./director.guard";
import { DirectorService } from "./director.service";

@Module({
  imports: [AuthModule],
  controllers: [DirectorController],
  providers: [DirectorService, CenterApproverGuard],
})
export class DirectorModule {}
