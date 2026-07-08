import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ClickService } from "./click.service";

/**
 * Click SHOP-API webhooks (form-encoded). No session auth — each request is
 * authenticated by its md5 sign_string, verified inside the handlers.
 */
@Controller("payments/click")
export class ClickController {
  constructor(private readonly click: ClickService) {}

  @Post("prepare")
  @HttpCode(200)
  prepare(@Body() body: Record<string, unknown>) {
    return this.click.prepare(body);
  }

  @Post("complete")
  @HttpCode(200)
  complete(@Body() body: Record<string, unknown>) {
    return this.click.complete(body);
  }
}
