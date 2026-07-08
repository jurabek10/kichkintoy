import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { PaymentsService } from "./payments.service";
import { clickConfig } from "./payments-config";

/**
 * Click SHOP-API callbacks (form-encoded prepare/complete). `merchant_trans_id`
 * carries our invoice UUID (the `transaction_param` of the checkout URL) and
 * `merchant_prepare_id` is the integer `Payment.seq`. Errors are Click codes in
 * a 200 response:
 *  0 ok, -1 bad signature, -2 wrong amount, -3 unknown action, -4 already paid,
 * -5 order not found, -6 transaction not found, -8 bad request, -9 cancelled.
 */

const OK = 0;
const ERR_SIGNATURE = -1;
const ERR_AMOUNT = -2;
const ERR_ACTION = -3;
const ERR_ALREADY_PAID = -4;
const ERR_ORDER_NOT_FOUND = -5;
const ERR_TRANSACTION_NOT_FOUND = -6;
const ERR_BAD_REQUEST = -8;
const ERR_CANCELLED = -9;

const ACTION_PREPARE = "0";
const ACTION_COMPLETE = "1";

type ClickBody = Record<string, unknown>;

@Injectable()
export class ClickService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async prepare(body: ClickBody) {
    const fields = readFields(body);
    const base = {
      click_trans_id: toNumber(fields.click_trans_id),
      merchant_trans_id: fields.merchant_trans_id,
    };

    const config = clickConfig();
    if (!config) return respond(base, ERR_BAD_REQUEST, "Service unavailable");
    if (fields.action !== ACTION_PREPARE) {
      return respond(base, ERR_ACTION, "Action not found");
    }
    if (fields.service_id !== config.serviceId) {
      return respond(base, ERR_BAD_REQUEST, "Unknown service");
    }
    const sign = md5(
      fields.click_trans_id +
        fields.service_id +
        config.secretKey +
        fields.merchant_trans_id +
        fields.amount +
        fields.action +
        fields.sign_time,
    );
    if (sign !== fields.sign_string.toLowerCase()) {
      return respond(base, ERR_SIGNATURE, "Sign check failed");
    }

    if (!UUID_PATTERN.test(fields.merchant_trans_id)) {
      return respond(base, ERR_ORDER_NOT_FOUND, "Order not found");
    }
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: fields.merchant_trans_id },
    });
    if (!invoice) return respond(base, ERR_ORDER_NOT_FOUND, "Order not found");
    if (invoice.status === "paid") {
      return respond(base, ERR_ALREADY_PAID, "Already paid");
    }
    if (invoice.status !== "issued") {
      return respond(base, ERR_CANCELLED, "Order cancelled");
    }
    if (Math.abs(Number(fields.amount) - Number(invoice.amount)) > 0.01) {
      return respond(base, ERR_AMOUNT, "Incorrect amount");
    }

    // Idempotent: a retried prepare for the same Click transaction answers
    // with the previously issued prepare id.
    const existing = await this.findPayment(fields.click_trans_id);
    if (existing) {
      if (existing.status === "paid") {
        return respond(base, ERR_ALREADY_PAID, "Already paid");
      }
      if (existing.status === "cancelled") {
        return respond(base, ERR_CANCELLED, "Transaction cancelled");
      }
      return respond(
        { ...base, merchant_prepare_id: existing.seq },
        OK,
        "Success",
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        provider: "click",
        providerTransactionId: fields.click_trans_id,
        amount: invoice.amount,
        currency: invoice.currency,
        status: "pending",
        rawPayload: { prepare: fields },
      },
    });

    return respond(
      { ...base, merchant_prepare_id: payment.seq },
      OK,
      "Success",
    );
  }

  async complete(body: ClickBody) {
    const fields = readFields(body);
    const base = {
      click_trans_id: toNumber(fields.click_trans_id),
      merchant_trans_id: fields.merchant_trans_id,
    };

    const config = clickConfig();
    if (!config) return respond(base, ERR_BAD_REQUEST, "Service unavailable");
    if (fields.action !== ACTION_COMPLETE) {
      return respond(base, ERR_ACTION, "Action not found");
    }
    if (fields.service_id !== config.serviceId) {
      return respond(base, ERR_BAD_REQUEST, "Unknown service");
    }
    const sign = md5(
      fields.click_trans_id +
        fields.service_id +
        config.secretKey +
        fields.merchant_trans_id +
        fields.merchant_prepare_id +
        fields.amount +
        fields.action +
        fields.sign_time,
    );
    if (sign !== fields.sign_string.toLowerCase()) {
      return respond(base, ERR_SIGNATURE, "Sign check failed");
    }

    const payment = await this.findPayment(fields.click_trans_id);
    if (!payment || String(payment.seq) !== fields.merchant_prepare_id) {
      return respond(base, ERR_TRANSACTION_NOT_FOUND, "Transaction not found");
    }
    if (payment.invoiceId !== fields.merchant_trans_id) {
      return respond(base, ERR_ORDER_NOT_FOUND, "Order not found");
    }

    // Click reports its own failure/cancellation through a negative `error`.
    if (toNumber(fields.error) < 0) {
      if (payment.status === "pending") {
        await this.prisma.$transaction((tx) =>
          this.payments.settlePaymentCancelled(tx, payment.id, {
            reason: toNumber(fields.error),
          }),
        );
      }
      return respond(base, ERR_CANCELLED, "Transaction cancelled");
    }

    if (payment.status === "paid") {
      return respond(base, ERR_ALREADY_PAID, "Already paid");
    }
    if (payment.status === "cancelled") {
      return respond(base, ERR_CANCELLED, "Transaction cancelled");
    }

    await this.prisma.$transaction((tx) =>
      this.payments.settlePaymentPaid(tx, payment.id, new Date()),
    );

    return respond(
      { ...base, merchant_confirm_id: payment.seq },
      OK,
      "Success",
    );
  }

  private findPayment(clickTransactionId: string) {
    return this.prisma.payment.findUnique({
      where: {
        provider_providerTransactionId: {
          provider: "click",
          providerTransactionId: clickTransactionId,
        },
      },
    });
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Click posts form-encoded strings; normalize every field we sign or read. */
function readFields(body: ClickBody) {
  const read = (key: string) => {
    const value = body[key];
    return typeof value === "string" ? value : value == null ? "" : String(value);
  };
  return {
    click_trans_id: read("click_trans_id"),
    service_id: read("service_id"),
    click_paydoc_id: read("click_paydoc_id"),
    merchant_trans_id: read("merchant_trans_id"),
    merchant_prepare_id: read("merchant_prepare_id"),
    amount: read("amount"),
    action: read("action"),
    error: read("error"),
    error_note: read("error_note"),
    sign_time: read("sign_time"),
    sign_string: read("sign_string"),
  };
}

function respond(
  base: Record<string, unknown>,
  error: number,
  errorNote: string,
) {
  return { ...base, error, error_note: errorNote };
}

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
