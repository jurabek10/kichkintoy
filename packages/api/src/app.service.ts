import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  health() {
    return {
      status: "ok",
      service: "kichkintoy-api",
      timestamp: new Date().toISOString()
    };
  }
}
