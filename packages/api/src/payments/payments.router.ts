import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createPaymentsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    overview: os.payments.overview
      .use(access.authed)
      .handler(async ({ context }) => {
        return deps.paymentsService.overview(context.user.id);
      }),
    history: os.payments.history
      .use(access.authed)
      .handler(async ({ context }) => {
        return deps.paymentsService.history(context.user.id);
      }),
    checkout: os.payments.checkout
      .use(access.authed)
      .handler(async ({ input, context }) => {
        return deps.paymentsService.checkout(context.user.id, input);
      }),
    invoiceStatus: os.payments.invoiceStatus
      .use(access.authed)
      .handler(async ({ input, context }) => {
        return deps.paymentsService.invoiceStatus(
          context.user.id,
          input.invoiceId,
        );
      }),
    sandboxPay: os.payments.sandboxPay
      .use(access.authed)
      .handler(async ({ input, context }) => {
        return deps.paymentsService.sandboxPay(context.user.id, input);
      }),
  };
}
