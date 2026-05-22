import { Injectable } from "@nestjs/common";
import { PrismaService } from "./database/prisma.service";

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  health() {
    return {
      status: "ok",
      service: "kichkintoy-api",
      timestamp: new Date().toISOString()
    };
  }

  async databaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      service: "postgres",
      timestamp: new Date().toISOString()
    };
  }
}
