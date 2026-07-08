/**
 * Provider credentials come from env and may be absent (the merchant accounts
 * are still being registered). A provider is "configured" only when everything
 * needed to build checkout URLs AND verify callbacks is present; until then the
 * dev-only sandbox flow keeps the feature demoable end to end.
 */

export type PaymeConfig = {
  merchantId: string;
  merchantKey: string;
  checkoutUrl: string;
};

export type ClickConfig = {
  serviceId: string;
  merchantId: string;
  secretKey: string;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function paymeConfig(): PaymeConfig | null {
  const merchantId = env("PAYME_MERCHANT_ID");
  const merchantKey = env("PAYME_MERCHANT_KEY");
  if (!merchantId || !merchantKey) return null;
  return {
    merchantId,
    merchantKey,
    checkoutUrl: env("PAYME_CHECKOUT_URL") || "https://checkout.paycom.uz",
  };
}

/** The callback password alone is enough to authenticate Payme callbacks. */
export function paymeMerchantKey(): string {
  return env("PAYME_MERCHANT_KEY");
}

export function clickConfig(): ClickConfig | null {
  const serviceId = env("CLICK_SERVICE_ID");
  const merchantId = env("CLICK_MERCHANT_ID");
  const secretKey = env("CLICK_SECRET_KEY");
  if (!serviceId || !merchantId || !secretKey) return null;
  return { serviceId, merchantId, secretKey };
}

export function clickSecretKey(): string {
  return env("CLICK_SECRET_KEY");
}

/** Where the provider sends the parent back after checkout. */
export function paymentsReturnUrl(): string {
  return env("PAYMENTS_RETURN_URL") || "http://localhost:3000/dashboard/payments";
}

/** Simulated payments: opt-in via env and never available in production. */
export function paymentsSandboxEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return env("PAYMENTS_SANDBOX") === "true";
}
