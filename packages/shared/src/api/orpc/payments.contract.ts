import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  checkoutInputSchema,
  checkoutResultSchema,
  invoiceStatusResultSchema,
  paymentsHistorySchema,
  paymentsOverviewSchema,
  sandboxPayInputSchema,
} from "../payments.js";

const invoiceIdInputSchema = z.object({ invoiceId: uuidSchema });

export const paymentsContract = {
  /** Current-month tuition per child; lazily creates the month's invoices. */
  overview: oc.output(paymentsOverviewSchema),
  /** All invoices (with payments) for the parent's children, newest first. */
  history: oc.output(paymentsHistorySchema),
  /** Build a provider checkout redirect (or signal sandbox mode). */
  checkout: oc.input(checkoutInputSchema).output(checkoutResultSchema),
  /** Poll a single invoice while a checkout is in flight. */
  invoiceStatus: oc
    .input(invoiceIdInputSchema)
    .output(invoiceStatusResultSchema),
  /** Dev-only: simulate a successful provider callback (fails closed in prod). */
  sandboxPay: oc
    .input(sandboxPayInputSchema)
    .output(invoiceStatusResultSchema),
};
