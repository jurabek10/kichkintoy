import { z } from "zod";
import { isoDateSchema, isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

/** Providers a parent can pay through. Sandbox payments reuse these names. */
export const paymentProviderValues = ["payme", "click"] as const;
export const paymentProviderSchema = z.enum(paymentProviderValues);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

export const invoiceStatusValues = ["issued", "paid", "cancelled"] as const;
export const invoiceStatusSchema = z.enum(invoiceStatusValues);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const paymentStatusValues = ["pending", "paid", "cancelled"] as const;
export const paymentStatusSchema = z.enum(paymentStatusValues);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const paymentSummarySchema = z.object({
  id: uuidSchema,
  provider: z.string(),
  amount: z.number(),
  status: paymentStatusSchema,
  sandbox: z.boolean(),
  paidAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type PaymentSummary = z.infer<typeof paymentSummarySchema>;

export const paymentChildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  // A media-asset id or legacy URL for the child's photo (resolved client-side).
  photoUrl: z.string().nullable(),
  centerId: uuidSchema,
  centerName: z.string(),
  className: z.string().nullable(),
});
export type PaymentChild = z.infer<typeof paymentChildSchema>;

export const tuitionInvoiceSchema = z.object({
  id: uuidSchema,
  amount: z.number(),
  currency: z.string(),
  status: invoiceStatusSchema,
  paidAmount: z.number(),
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  dueDate: isoDateSchema.nullable(),
  /** Calendar month the invoice covers, e.g. "2026-07". */
  monthLabel: z.string().regex(/^\d{4}-\d{2}$/),
});
export type TuitionInvoice = z.infer<typeof tuitionInvoiceSchema>;

export const paymentsOverviewSchema = z.object({
  month: z.object({
    label: z.string().regex(/^\d{4}-\d{2}$/),
    periodStart: isoDateSchema,
    periodEnd: isoDateSchema,
  }),
  providers: z.object({
    payme: z.boolean(),
    click: z.boolean(),
    sandbox: z.boolean(),
  }),
  children: z.array(
    z.object({
      child: paymentChildSchema,
      invoice: tuitionInvoiceSchema,
    }),
  ),
});
export type PaymentsOverview = z.infer<typeof paymentsOverviewSchema>;

export const paymentsHistoryItemSchema = z.object({
  invoice: tuitionInvoiceSchema,
  child: paymentChildSchema,
  payments: z.array(paymentSummarySchema),
});
export type PaymentsHistoryItem = z.infer<typeof paymentsHistoryItemSchema>;
export const paymentsHistorySchema = z.array(paymentsHistoryItemSchema);

export const checkoutInputSchema = z.object({
  invoiceId: uuidSchema,
  provider: paymentProviderSchema,
  language: z.enum(["uz", "ru", "en"]).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const checkoutResultSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("redirect"), url: z.string().url() }),
  z.object({ mode: z.literal("sandbox") }),
]);
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;

export const invoiceStatusResultSchema = z.object({
  id: uuidSchema,
  status: invoiceStatusSchema,
  amount: z.number(),
  paidAmount: z.number(),
  payments: z.array(paymentSummarySchema),
});
export type InvoiceStatusResult = z.infer<typeof invoiceStatusResultSchema>;

export const sandboxPayInputSchema = z.object({
  invoiceId: uuidSchema,
  provider: paymentProviderSchema,
});
export type SandboxPayInput = z.infer<typeof sandboxPayInputSchema>;
