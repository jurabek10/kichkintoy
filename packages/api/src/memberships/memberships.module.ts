import { Global, Module } from "@nestjs/common";
import { MembershipsService } from "./memberships.service";

@Global()
@Module({
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
