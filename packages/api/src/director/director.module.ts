import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ClassService } from "./class.service";
import { CenterApproverGuard } from "./director.guard";
import { DirectorService } from "./director.service";

@Module({
  imports: [AuthModule],
  providers: [DirectorService, ClassService, CenterApproverGuard],
})
export class DirectorModule {}
