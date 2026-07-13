import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type {
  CheckoutInput,
  CheckoutResult,
  InvoiceStatusResult,
  PaymentsHistoryItem,
  PaymentsOverview,
  SandboxPayInput,
} from "@kichkintoy/shared";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { currentTashkentMonth, dateOnly } from "../common/tashkent-month";
import {
  clickConfig,
  paymeConfig,
  paymentsReturnUrl,
  paymentsSandboxEnabled,
} from "./payments-config";

type Tx = Prisma.TransactionClient;

type InvoiceWithPayments = Prisma.InvoiceGetPayload<{
  include: { payments: true };
}>;

type ParentEnrollment = {
  childId: string;
  childName: string;
  photoUrl: string | null;
  centerId: string;
  centerName: string;
  className: string | null;
  monthlyTuitionUzs: Prisma.Decimal;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- parents

  async overview(userId: string): Promise<PaymentsOverview> {
    const month = currentTashkentMonth();
    const enrollments = await this.parentEnrollments(userId);

    const children: PaymentsOverview["children"] = [];
    for (const enrollment of enrollments) {
      const invoice = await this.ensureMonthInvoice(userId, enrollment, month);
      children.push({
        child: {
          id: enrollment.childId,
          name: enrollment.childName,
          photoUrl: enrollment.photoUrl,
          centerId: enrollment.centerId,
          centerName: enrollment.centerName,
          className: enrollment.className,
        },
        invoice: serializeInvoice(invoice),
      });
    }

    return {
      month: {
        label: month.label,
        periodStart: dateOnly(month.periodStartDate),
        periodEnd: dateOnly(month.periodEndDate),
      },
      providers: {
        payme: paymeConfig() !== null,
        click: clickConfig() !== null,
        sandbox: paymentsSandboxEnabled(),
      },
      children,
    };
  }

  async history(userId: string): Promise<PaymentsHistoryItem[]> {
    const enrollments = await this.parentEnrollments(userId);
    if (enrollments.length === 0) return [];

    const byChild = new Map(enrollments.map((item) => [item.childId, item]));
    const invoices = await this.prisma.invoice.findMany({
      where: { childId: { in: [...byChild.keys()] } },
      include: { payments: true },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });

    return invoices.map((invoice) => {
      const enrollment = byChild.get(invoice.childId)!;
      return {
        invoice: serializeInvoice(invoice),
        child: {
          id: enrollment.childId,
          name: enrollment.childName,
          photoUrl: enrollment.photoUrl,
          centerId: enrollment.centerId,
          centerName: enrollment.centerName,
          className: enrollment.className,
        },
        payments: invoice.payments
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(serializePayment),
      };
    });
  }

  async checkout(userId: string, input: CheckoutInput): Promise<CheckoutResult> {
    const invoice = await this.requireParentInvoice(userId, input.invoiceId);
    if (invoice.status === "paid") {
      throw new BadRequestException("This invoice is already paid.");
    }
    if (invoice.status === "cancelled") {
      throw new BadRequestException("This invoice was cancelled.");
    }

    const returnUrl = paymentsReturnUrl();
    const amount = Number(invoice.amount);

    if (input.provider === "payme") {
      const config = paymeConfig();
      if (config) {
        // https://checkout.paycom.uz/{base64(m=...;ac.invoice_id=...;a=tiyin;c=return;l=lang)}
        const params = [
          `m=${config.merchantId}`,
          `ac.invoice_id=${invoice.id}`,
          `a=${Math.round(amount * 100)}`,
          `c=${returnUrl}`,
          `l=${input.language ?? "uz"}`,
        ].join(";");
        const encoded = Buffer.from(params, "utf8").toString("base64");
        return { mode: "redirect", url: `${config.checkoutUrl}/${encoded}` };
      }
    } else {
      const config = clickConfig();
      if (config) {
        const query = new URLSearchParams({
          service_id: config.serviceId,
          merchant_id: config.merchantId,
          amount: amount.toFixed(2),
          transaction_param: invoice.id,
          return_url: returnUrl,
        });
        return {
          mode: "redirect",
          url: `https://my.click.uz/services/pay?${query.toString()}`,
        };
      }
    }

    if (paymentsSandboxEnabled()) {
      return { mode: "sandbox" };
    }
    throw new BadRequestException(
      "This payment provider is not configured yet.",
    );
  }

  async invoiceStatus(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceStatusResult> {
    const invoice = await this.requireParentInvoice(userId, invoiceId);
    return serializeInvoiceStatus(invoice);
  }

  /**
   * Dev-only stand-in for a provider callback: runs the exact settlement path a
   * real Payme/Click confirmation would, so demoing works without credentials.
   */
  async sandboxPay(
    userId: string,
    input: SandboxPayInput,
  ): Promise<InvoiceStatusResult> {
    if (!paymentsSandboxEnabled()) {
      throw new ForbiddenException("Sandbox payments are disabled.");
    }
    const invoice = await this.requireParentInvoice(userId, input.invoiceId);
    if (invoice.status !== "issued") {
      throw new BadRequestException("This invoice cannot be paid.");
    }

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          provider: input.provider,
          providerTransactionId: `sandbox:${randomUUID()}`,
          amount: invoice.amount,
          currency: invoice.currency,
          status: "pending",
          rawPayload: { sandbox: true },
        },
      });
      await this.settlePaymentPaid(tx, payment.id, new Date());
    });

    return serializeInvoiceStatus(
      await this.requireParentInvoice(userId, input.invoiceId),
    );
  }

  // ------------------------------------------------------------- settlement

  /**
   * Mark a payment as paid and recompute its invoice. Used by every provider
   * (Payme perform, Click complete, sandbox) so state transitions are uniform.
   */
  async settlePaymentPaid(tx: Tx, paymentId: string, paidAt: Date) {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "paid", paidAt },
      include: { invoice: true },
    });
    const becamePaid = await this.recomputeInvoice(tx, payment.invoiceId);

    await this.audit.log(
      {
        centerId: payment.invoice.centerId,
        action: "payment.paid",
        entityType: "payment",
        entityId: payment.id,
        metadata: {
          provider: payment.provider,
          invoice_id: payment.invoiceId,
          amount: Number(payment.amount),
        },
      },
      tx,
    );

    if (becamePaid) {
      const child = await tx.child.findUnique({
        where: { id: payment.invoice.childId },
        select: { firstName: true, lastName: true },
      });
      const childName = [child?.firstName, child?.lastName]
        .filter(Boolean)
        .join(" ");
      await this.notifications.enqueue(
        {
          userId: payment.invoice.parentUserId,
          notificationType: "payment.received",
          title: "Tuition payment received.",
          body: `The monthly fee for ${childName || "your child"} was paid successfully.`,
          entityType: "invoice",
          entityId: payment.invoiceId,
          channels: ["in_app", "push"],
        },
        tx,
      );
    }

    return payment;
  }

  /** Cancel a payment (provider-side cancel/refund) and recompute the invoice. */
  async settlePaymentCancelled(
    tx: Tx,
    paymentId: string,
    args: { reason?: number | null; providerState?: number | null },
  ) {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: args.reason ?? null,
        ...(args.providerState !== undefined
          ? { providerState: args.providerState }
          : {}),
      },
      include: { invoice: true },
    });
    await this.recomputeInvoice(tx, payment.invoiceId);

    await this.audit.log(
      {
        centerId: payment.invoice.centerId,
        action: "payment.cancelled",
        entityType: "payment",
        entityId: payment.id,
        metadata: {
          provider: payment.provider,
          invoice_id: payment.invoiceId,
          reason: args.reason ?? null,
        },
      },
      tx,
    );

    return payment;
  }

  /** Returns true when this call transitioned the invoice into "paid". */
  private async recomputeInvoice(tx: Tx, invoiceId: string): Promise<boolean> {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: true },
    });
    const paidAmount = sumPaid(invoice);
    const nextStatus = paidAmount >= Number(invoice.amount) ? "paid" : "issued";
    if (invoice.status === "cancelled" || invoice.status === nextStatus) {
      return false;
    }
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: nextStatus },
    });
    return nextStatus === "paid";
  }

  // ---------------------------------------------------------------- helpers

  private async parentEnrollments(
    userId: string,
  ): Promise<ParentEnrollment[]> {
    const guardians = await this.prisma.childGuardian.findMany({
      where: { userId, isPrimary: true, child: { status: "active" } },
      include: {
        child: {
          include: {
            childEnrollments: {
              where: { enrollmentStatus: "active" },
              include: {
                center: {
                  select: { id: true, name: true, monthlyTuitionUzs: true },
                },
                class: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const seen = new Set<string>();
    const enrollments: ParentEnrollment[] = [];
    for (const guardian of guardians) {
      for (const enrollment of guardian.child.childEnrollments) {
        const key = `${guardian.childId}:${enrollment.centerId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        enrollments.push({
          childId: guardian.childId,
          childName: [guardian.child.firstName, guardian.child.lastName]
            .filter(Boolean)
            .join(" "),
          photoUrl: guardian.child.photoUrl,
          centerId: enrollment.centerId,
          centerName: enrollment.center.name,
          className: enrollment.class?.name ?? null,
          monthlyTuitionUzs: enrollment.center.monthlyTuitionUzs,
        });
      }
    }
    return enrollments;
  }

  private async ensureMonthInvoice(
    userId: string,
    enrollment: ParentEnrollment,
    month: ReturnType<typeof currentTashkentMonth>,
  ): Promise<InvoiceWithPayments> {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        childId: enrollment.childId,
        centerId: enrollment.centerId,
        periodStart: month.periodStartDate,
      },
      include: { payments: true },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;

    return this.prisma.invoice.create({
      data: {
        centerId: enrollment.centerId,
        childId: enrollment.childId,
        parentUserId: userId,
        amount: enrollment.monthlyTuitionUzs,
        currency: "UZS",
        periodStart: month.periodStartDate,
        periodEnd: month.periodEndDate,
        dueDate: month.periodEndDate,
        status: "issued",
      },
      include: { payments: true },
    });
  }

  private async requireParentInvoice(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceWithPayments> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found.");
    }
    const guardian = await this.prisma.childGuardian.findFirst({
      where: { userId, childId: invoice.childId, isPrimary: true },
      select: { id: true },
    });
    if (!guardian) {
      throw new ForbiddenException("You cannot access this invoice.");
    }
    return invoice;
  }
}

function sumPaid(invoice: InvoiceWithPayments): number {
  return invoice.payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
}

function serializeInvoice(invoice: InvoiceWithPayments) {
  const periodStart = invoice.periodStart ?? invoice.createdAt;
  return {
    id: invoice.id,
    amount: Number(invoice.amount),
    currency: invoice.currency,
    status: normalizeInvoiceStatus(invoice.status),
    paidAmount: sumPaid(invoice),
    periodStart: dateOnly(periodStart),
    periodEnd: dateOnly(invoice.periodEnd ?? periodStart),
    dueDate: invoice.dueDate ? dateOnly(invoice.dueDate) : null,
    monthLabel: dateOnly(periodStart).slice(0, 7),
  };
}

function serializeInvoiceStatus(invoice: InvoiceWithPayments) {
  return {
    id: invoice.id,
    status: normalizeInvoiceStatus(invoice.status),
    amount: Number(invoice.amount),
    paidAmount: sumPaid(invoice),
    payments: invoice.payments
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(serializePayment),
  };
}

function serializePayment(payment: {
  id: string;
  provider: string;
  providerTransactionId: string | null;
  amount: Prisma.Decimal;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: payment.id,
    provider: payment.provider,
    amount: Number(payment.amount),
    status: normalizePaymentStatus(payment.status),
    sandbox: payment.providerTransactionId?.startsWith("sandbox:") ?? false,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function normalizeInvoiceStatus(status: string): "issued" | "paid" | "cancelled" {
  const value = status.toLowerCase();
  if (value === "paid") return "paid";
  if (value === "cancelled") return "cancelled";
  return "issued";
}

function normalizePaymentStatus(
  status: string,
): "pending" | "paid" | "cancelled" {
  const value = status.toLowerCase();
  if (["paid", "success", "completed"].includes(value)) return "paid";
  if (["cancelled", "canceled", "failed"].includes(value)) return "cancelled";
  return "pending";
}
