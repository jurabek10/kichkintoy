import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ClassController } from "./class.controller";
import { ClassService } from "./class.service";
import { DirectorController } from "./director.controller";
import { CenterApproverGuard } from "./director.guard";
import { DirectorService } from "./director.service";

@Module({
  imports: [AuthModule],
  controllers: [DirectorController, ClassController],
  providers: [DirectorService, ClassService, CenterApproverGuard],
})
export class DirectorModule {}
