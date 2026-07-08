import { Body, Controller, Headers, HttpCode, Post } from "@nestjs/common";
import { PaymeService } from "./payme.service";

/**
 * Payme Merchant API webhook. No session auth — Payme authenticates with
 * Basic auth verified inside the handler, and every failure is a JSON-RPC
 * error object in a 200 response (the protocol never uses HTTP errors).
 */
@Controller("payments/payme")
export class PaymeController {
  constructor(private readonly payme: PaymeService) {}

  @Post()
  @HttpCode(200)
  handle(
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
  ) {
    return this.payme.handle(body, authorization);
  }
}
