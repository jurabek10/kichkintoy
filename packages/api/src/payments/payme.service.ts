import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { PaymentsService } from "./payments.service";
import { paymeMerchantKey } from "./payments-config";

/**
 * Payme Merchant API endpoint (JSON-RPC 2.0). Payme's billing calls this with
 * Basic auth ("Paycom" + merchant key); we never call Payme. Amounts are in
 * tiyin (so'm x 100), the payment account field is `ac.invoice_id`, and every
 * business failure is a JSON-RPC error object in a 200 response.
 *
 * Transaction states: 1 created, 2 performed, -1 cancelled before perform,
 * -2 cancelled after perform (refund).
 */

const CREATED = 1;
const PERFORMED = 2;
const CANCELLED = -1;
const CANCELLED_AFTER_PERFORM = -2;

/** Payme cancels unperformed transactions after 12 hours (reason 4). */
const TRANSACTION_TTL_MS = 12 * 60 * 60 * 1000;
const TIMEOUT_REASON = 4;

const ERROR = {
  transportAuth: -32504,
  methodNotFound: -32601,
  invalidParams: -32602,
  system: -32400,
  wrongAmount: -31001,
  transactionNotFound: -31003,
  cannotPerform: -31008,
  invoiceNotFound: -31050,
  invoiceUnavailable: -31051,
} as const;

class PaymeError extends Error {
  constructor(
    readonly code: number,
    readonly messages: { uz: string; ru: string; en: string },
    readonly data?: string,
  ) {
    super(messages.en);
  }
}

type PaymePayment = Prisma.PaymentGetPayload<Record<string, never>>;

@Injectable()
export class PaymeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async handle(body: unknown, authorizationHeader: string | undefined) {
    const request = (body ?? {}) as {
      id?: unknown;
      method?: unknown;
      params?: unknown;
    };
    const id = typeof request.id === "number" ? request.id : null;

    try {
      this.authorize(authorizationHeader);
      const params = (request.params ?? {}) as Record<string, unknown>;
      const result = await this.dispatch(String(request.method ?? ""), params);
      return { jsonrpc: "2.0", id, result };
    } catch (error) {
      const paymeError =
        error instanceof PaymeError
          ? error
          : new PaymeError(ERROR.system, {
              uz: "Ichki xatolik.",
              ru: "Внутренняя ошибка.",
              en: "Internal error.",
            });
      if (!(error instanceof PaymeError)) console.error(error);
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: paymeError.code,
          message: paymeError.messages,
          ...(paymeError.data ? { data: paymeError.data } : {}),
        },
      };
    }
  }

  private authorize(header: string | undefined) {
    const key = paymeMerchantKey();
    const expected = `Basic ${Buffer.from(`Paycom:${key}`).toString("base64")}`;
    const provided = header ?? "";
    const matches =
      key.length > 0 &&
      provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!matches) {
      throw new PaymeError(ERROR.transportAuth, {
        uz: "Avtorizatsiya xatosi.",
        ru: "Ошибка авторизации.",
        en: "Authorization failure.",
      });
    }
  }

  private dispatch(method: string, params: Record<string, unknown>) {
    switch (method) {
      case "CheckPerformTransaction":
        return this.checkPerformTransaction(params);
      case "CreateTransaction":
        return this.createTransaction(params);
      case "PerformTransaction":
        return this.performTransaction(params);
      case "CancelTransaction":
        return this.cancelTransaction(params);
      case "CheckTransaction":
        return this.checkTransaction(params);
      case "GetStatement":
        return this.getStatement(params);
      default:
        throw new PaymeError(ERROR.methodNotFound, {
          uz: "Metod topilmadi.",
          ru: "Метод не найден.",
          en: "Method not found.",
        });
    }
  }

  // ----------------------------------------------------------------- methods

  private async checkPerformTransaction(params: Record<string, unknown>) {
    await this.validateAccount(params);
    return { allow: true };
  }

  private async createTransaction(params: Record<string, unknown>) {
    const transactionId = requireString(params.id);
    const time = requireNumber(params.time);

    const existing = await this.findPayment(transactionId);
    if (existing) {
      if (existing.providerState !== CREATED) {
        throw cannotPerform();
      }
      if (this.isExpired(existing)) {
        await this.expire(existing);
        throw cannotPerform();
      }
      return {
        create_time: paymeTime(existing) ?? time,
        transaction: existing.id,
        state: CREATED,
      };
    }

    const invoice = await this.validateAccount(params);

    // Payme allows a single live transaction per account: a second concurrent
    // one for the same invoice must be refused until the first resolves.
    const concurrent = await this.prisma.payment.findFirst({
      where: { invoiceId: invoice.id, provider: "payme", status: "pending" },
      select: { id: true },
    });
    if (concurrent) throw cannotPerform();

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        provider: "payme",
        providerTransactionId: transactionId,
        providerState: CREATED,
        amount: invoice.amount,
        currency: invoice.currency,
        status: "pending",
        rawPayload: { paymeTime: time, account: { invoice_id: invoice.id } },
      },
    });

    return { create_time: time, transaction: payment.id, state: CREATED };
  }

  private async performTransaction(params: Record<string, unknown>) {
    const payment = await this.requirePayment(params);

    if (payment.providerState === PERFORMED) {
      return {
        transaction: payment.id,
        perform_time: payment.paidAt?.getTime() ?? 0,
        state: PERFORMED,
      };
    }
    if (payment.providerState !== CREATED) {
      throw cannotPerform();
    }
    if (this.isExpired(payment)) {
      await this.expire(payment);
      throw cannotPerform();
    }

    const paidAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { providerState: PERFORMED },
      });
      await this.payments.settlePaymentPaid(tx, payment.id, paidAt);
    });

    return {
      transaction: payment.id,
      perform_time: paidAt.getTime(),
      state: PERFORMED,
    };
  }

  private async cancelTransaction(params: Record<string, unknown>) {
    const payment = await this.requirePayment(params);
    const reason = typeof params.reason === "number" ? params.reason : null;

    if (
      payment.providerState === CANCELLED ||
      payment.providerState === CANCELLED_AFTER_PERFORM
    ) {
      return {
        transaction: payment.id,
        cancel_time: payment.cancelledAt?.getTime() ?? 0,
        state: payment.providerState,
      };
    }

    const state =
      payment.providerState === PERFORMED ? CANCELLED_AFTER_PERFORM : CANCELLED;
    const cancelled = await this.prisma.$transaction((tx) =>
      this.payments.settlePaymentCancelled(tx, payment.id, {
        reason,
        providerState: state,
      }),
    );

    return {
      transaction: payment.id,
      cancel_time: cancelled.cancelledAt?.getTime() ?? Date.now(),
      state,
    };
  }

  private async checkTransaction(params: Record<string, unknown>) {
    const payment = await this.requirePayment(params);
    return this.serializeTransaction(payment);
  }

  private async getStatement(params: Record<string, unknown>) {
    const from = requireNumber(params.from);
    const to = requireNumber(params.to);

    const payments = await this.prisma.payment.findMany({
      where: { provider: "payme" },
      orderBy: { createdAt: "asc" },
    });
    const transactions = payments
      .filter((payment) => {
        const time = paymeTime(payment) ?? payment.createdAt.getTime();
        return time >= from && time <= to;
      })
      .map((payment) => ({
        id: payment.providerTransactionId,
        time: paymeTime(payment) ?? payment.createdAt.getTime(),
        amount: toTiyin(payment.amount),
        account: { invoice_id: payment.invoiceId },
        ...this.serializeTransaction(payment),
      }));

    return { transactions };
  }

  // ----------------------------------------------------------------- helpers

  private serializeTransaction(payment: PaymePayment) {
    return {
      create_time: paymeTime(payment) ?? payment.createdAt.getTime(),
      perform_time: payment.paidAt?.getTime() ?? 0,
      cancel_time: payment.cancelledAt?.getTime() ?? 0,
      transaction: payment.id,
      state: payment.providerState ?? CREATED,
      reason: payment.cancelReason,
    };
  }

  /** Resolve `ac.invoice_id` to a payable invoice with a matching amount. */
  private async validateAccount(params: Record<string, unknown>) {
    const account = (params.account ?? {}) as Record<string, unknown>;
    const invoiceId =
      typeof account.invoice_id === "string" ? account.invoice_id : "";
    if (!UUID_PATTERN.test(invoiceId)) {
      throw invoiceNotFound();
    }
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw invoiceNotFound();
    if (invoice.status !== "issued") {
      throw new PaymeError(
        ERROR.invoiceUnavailable,
        {
          uz: "Hisob allaqachon to'langan yoki bekor qilingan.",
          ru: "Счёт уже оплачен или отменён.",
          en: "The invoice is already paid or cancelled.",
        },
        "invoice_id",
      );
    }
    if (requireNumber(params.amount) !== toTiyin(invoice.amount)) {
      throw new PaymeError(ERROR.wrongAmount, {
        uz: "Noto'g'ri summa.",
        ru: "Неверная сумма.",
        en: "Incorrect amount.",
      });
    }
    return invoice;
  }

  private findPayment(transactionId: string) {
    return this.prisma.payment.findUnique({
      where: {
        provider_providerTransactionId: {
          provider: "payme",
          providerTransactionId: transactionId,
        },
      },
    });
  }

  private async requirePayment(params: Record<string, unknown>) {
    const payment = await this.findPayment(requireString(params.id));
    if (!payment) {
      throw new PaymeError(ERROR.transactionNotFound, {
        uz: "Tranzaksiya topilmadi.",
        ru: "Транзакция не найдена.",
        en: "Transaction not found.",
      });
    }
    return payment;
  }

  private isExpired(payment: PaymePayment) {
    const created = paymeTime(payment) ?? payment.createdAt.getTime();
    return Date.now() - created > TRANSACTION_TTL_MS;
  }

  private expire(payment: PaymePayment) {
    return this.prisma.$transaction((tx) =>
      this.payments.settlePaymentCancelled(tx, payment.id, {
        reason: TIMEOUT_REASON,
        providerState: CANCELLED,
      }),
    );
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function paymeTime(payment: PaymePayment): number | null {
  const raw = payment.rawPayload;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const value = (raw as Record<string, unknown>).paymeTime;
    if (typeof value === "number") return value;
  }
  return null;
}

function toTiyin(amount: Prisma.Decimal): number {
  return Math.round(Number(amount) * 100);
}

function requireString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw invalidParams();
  return value;
}

function requireNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidParams();
  }
  return value;
}

function invalidParams() {
  return new PaymeError(ERROR.invalidParams, {
    uz: "Noto'g'ri so'rov parametrlari.",
    ru: "Неверные параметры запроса.",
    en: "Invalid request parameters.",
  });
}

function invoiceNotFound() {
  return new PaymeError(
    ERROR.invoiceNotFound,
    {
      uz: "Hisob topilmadi.",
      ru: "Счёт не найден.",
      en: "Invoice not found.",
    },
    "invoice_id",
  );
}

function cannotPerform() {
  return new PaymeError(ERROR.cannotPerform, {
    uz: "Tranzaksiyani bajarib bo'lmaydi.",
    ru: "Невозможно выполнить операцию.",
    en: "Unable to perform the operation.",
  });
}
