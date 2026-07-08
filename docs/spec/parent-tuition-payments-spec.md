# Parent Tuition Payments — Payme & Click Integration

## Overview

Parents pay their child's monthly kindergarten fee from inside the app using the two
dominant Uzbek payment providers, **Payme** and **Click**. The parent opens the
Payments page, sees the current month's invoice per child, taps *Payme* or *Click*,
completes the payment on the provider's checkout page/app, and the invoice status
flips to **paid** automatically when the provider confirms the payment through its
server-to-server callback.

No card data ever touches our servers — both providers host the checkout; we only
receive signed callbacks.

**Merchant credentials do not exist yet.** The integration is built credential-ready:
all provider identifiers/keys come from env vars, and while they are unset the app
runs in a **sandbox mode** that simulates the provider callback so the whole flow
(invoice → checkout → paid status → notification) is demoable end to end today.
Adding real credentials later is a `.env` change only.

## Scope

**Stage 1 (this implementation)**
- Backend: invoice generation, Payme Merchant API callback, Click SHOP-API callbacks,
  parent-facing oRPC endpoints, sandbox mode, payment notifications.
- Web: parent Payments page (`/dashboard/payments`) + feature tile on the parent home.
- i18n: `payments` namespace in uz / ru / en.

**Stage 2 (follow-up, not in this change)**
- Parent mobile Payments screen (reuses the same oRPC endpoints; checkout opens in
  the system browser via the same URLs).
- Director-side tuition settings UI (edit the center's monthly fee) and per-invoice
  drill-down in the tuition console.

## Data model (Prisma)

Existing `Invoice` and `Payment` models are reused with small additions.

### Center
- `monthlyTuitionUzs Decimal(14,2) @default(1000000)` — the monthly fee for the
  center. Replaces the hardcoded `DEFAULT_MONTHLY_TUITION_UZS` constant in
  `DirectorService.getHomeSummary`, which now reads the center's value.

### Invoice (existing, statuses formalized)
- `status`: `issued` → `paid` (or back to `issued` if a performed payment is
  cancelled by the provider and the paid sum drops below the amount).
- One invoice per **(child, center, calendar month)** in Asia/Tashkent time.
  `periodStart` = first day of month, `periodEnd` = last day, `dueDate` = last day.
- **Lazy generation**: when a parent opens the Payments page
  (`payments.overview`), the API ensures an invoice for the current Tashkent
  month exists for each of the parent's actively enrolled children, with
  `amount = center.monthlyTuitionUzs`. No cron needed.

### Payment (existing, extended)
- `seq Int @default(autoincrement()) @unique` — integer id required by Click's
  `merchant_prepare_id` (our primary key is a UUID).
- `providerState Int?` — Payme transaction state (1 created, 2 performed,
  -1 cancelled, -2 cancelled after perform). Click uses only status.
- `cancelReason Int?`, `cancelledAt DateTime?`
- `@@unique([provider, providerTransactionId])` — webhook idempotency.
- `status`: `pending` → `paid` | `cancelled`.
- `provider`: `payme` | `click` | `sandbox`.
- `rawPayload` keeps provider-specific fields verbatim (e.g. Payme's original
  `time` in ms, needed by `GetStatement`/`CheckTransaction`).

## Provider protocols

Both providers call us server-to-server; endpoints live under the global
`api/v1` prefix and are **unauthenticated by session** (they carry their own
provider auth). They are plain NestJS controllers, not oRPC.

### Payme — Merchant API (JSON-RPC 2.0)

Single endpoint: `POST /api/v1/payments/payme`.

- **Auth**: `Authorization: Basic base64("Paycom:" + PAYME_MERCHANT_KEY)`,
  verified with a constant-time compare. Failure → error `-32504`.
- **Account field**: `ac.invoice_id` (our invoice UUID). Unknown/foreign invoice →
  `-31050`; wrong amount → `-31001` (Payme sends **tiyin** = so'm × 100).
- **Methods** (per Payme Merchant API spec):
  - `CheckPerformTransaction` — invoice exists, is `issued`, amount matches → `{ allow: true }`.
  - `CreateTransaction` — creates a `pending` Payment (state 1). Idempotent by
    Payme transaction id. A second *different* Payme transaction for an invoice
    that already has a live pending/paid one → `-31008`. Transactions in state 1
    older than 12 hours are auto-cancelled (reason 4) and answered with `-31008`.
  - `PerformTransaction` — state 2, sets `paidAt`, marks the payment `paid` and
    recomputes the invoice status. Idempotent (returns the stored `perform_time`).
  - `CancelTransaction` — state -1 (before perform) or -2 (after perform, refund);
    recomputes invoice status back to `issued` when needed. Idempotent.
  - `CheckTransaction` — echoes state and create/perform/cancel times.
  - `GetStatement` — all Payme transactions in `[from, to]`.
- **Checkout URL**: `https://checkout.paycom.uz/` + base64 of
  `m={PAYME_MERCHANT_ID};ac.invoice_id={invoiceId};a={amountTiyin};c={returnUrl};l={lang}`.

### Click — SHOP-API

Two endpoints, `application/x-www-form-urlencoded`:

- `POST /api/v1/payments/click/prepare` (action = 0)
  - Verify `sign_string = md5(click_trans_id + service_id + CLICK_SECRET_KEY +
    merchant_trans_id + amount + action + sign_time)`; mismatch → error `-1`.
  - `merchant_trans_id` is our invoice UUID; missing invoice → `-5`; already paid
    → `-4`; amount mismatch (so'm, decimal) → `-2`.
  - Creates a `pending` Payment and answers with `merchant_prepare_id = payment.seq`.
- `POST /api/v1/payments/click/complete` (action = 1)
  - Signature additionally includes `merchant_prepare_id` after `merchant_trans_id`.
  - `error < 0` from Click → cancel the payment (answer error `-9`).
  - Success → mark paid, recompute invoice, answer `merchant_confirm_id`.
  - Idempotent by `click_trans_id` (answer `-4` if this transaction already paid the invoice).
- **Checkout URL**: `https://my.click.uz/services/pay?service_id={CLICK_SERVICE_ID}`
  `&merchant_id={CLICK_MERCHANT_ID}&amount={amount}&transaction_param={invoiceId}`
  `&return_url={returnUrl}`.

### Shared settlement logic

One internal function applies a payment result and recomputes the invoice:
invoice becomes `paid` when the sum of its `paid` payments ≥ `amount`; drops back
to `issued` when a cancellation brings the sum below. On the issued→paid
transition the parent gets a `payment.received` notification (in-app + push)
via the existing `NotificationsService`.

## Configuration (env)

```
# --- Parent tuition payments (Payme / Click) ---
PAYME_MERCHANT_ID=""        # merchant id from Payme business cabinet
PAYME_MERCHANT_KEY=""       # callback password (Merchant API key)
PAYME_CHECKOUT_URL="https://checkout.paycom.uz"
CLICK_SERVICE_ID=""
CLICK_MERCHANT_ID=""
CLICK_SECRET_KEY=""
PAYMENTS_RETURN_URL="http://localhost:3000/dashboard/payments"
# Sandbox: simulate provider callbacks while credentials are missing (never in production)
PAYMENTS_SANDBOX="true"
```

A provider counts as **configured** when its id + key/secret are set. Sandbox mode
is active only when `PAYMENTS_SANDBOX=true` **and** `NODE_ENV !== "production"`;
`payments.sandboxPay` refuses otherwise (fails closed, same pattern as the OTP
demo bypass).

## oRPC contract — `payments` (parent-scoped)

- `overview` → ensures current-month invoices, returns
  `{ month: {label, periodStart, periodEnd}, providers: {payme, click, sandbox}, children: [{ child {id,name,photoUrl}, centerName, className, invoice {id, amount, currency, status, paidAmount, dueDate} }] }`
- `history` → past + current invoices for the parent's children, newest first,
  each with its payments (provider, amount, status, paidAt). Client paginates 10/page.
- `checkout` `{invoiceId, provider: "payme"|"click", language}` → `{ mode: "redirect", url }`
  when the provider is configured, `{ mode: "sandbox" }` otherwise.
- `invoiceStatus` `{invoiceId}` → `{status, paidAmount, payments[]}` — polled by the
  web page while a checkout is in flight / after returning from the provider.
- `sandboxPay` `{invoiceId, provider}` → runs the same settlement path a real
  callback would (creates a `sandbox` payment, marks it paid). Dev only.

All handlers verify the invoice belongs to one of the caller's children
(`ChildGuardian`), following the `parentAccess` pattern used in pickups.

## Web UI (parent only)

- **Entry**: new tile in the parent-home feature grid (wallet icon) + row in the
  sidebar nav config where parent items are declared; route `/dashboard/payments`.
- **Page** (mirrors the medications page structure: Card + PageHeading + DataTable):
  1. **Current month section** — one card per child: photo + name (single block),
     center/class, amount (`1.000.000 so'm` via shared `formatMoney`), status badge
     (To'lanmagan / To'langan), and two buttons — **Payme** and **Click**. Paid
     invoices show the paid state instead of buttons.
  2. **History table** — TanStack table, 10 rows/page, no horizontal scroll:
     row №, child (photo + name in one column), month, amount, provider, status,
     paid date (`25.06.2026` format).
- **Checkout flow**: `checkout` → `mode:"redirect"` opens the provider URL in the
  same tab (provider returns to `PAYMENTS_RETURN_URL`); `mode:"sandbox"` opens a
  dialog that explains sandbox mode and confirms a simulated payment via
  `sandboxPay`. While an invoice is pending after checkout, the page polls
  `invoiceStatus` every few seconds and flips the badge to paid without a reload.
- `formatMoney` moves from `dashboard-home.tsx` into `lib/format.ts` and is reused.

## i18n

New `payments.json` namespace (uz / ru / en) with identical keys across languages:
page title/description, month card labels, statuses, pay buttons, sandbox dialog,
history column headers, empty states, error toasts. Uzbek strings verified to fit
buttons (e.g. "To'lash" on the pay button, provider names stay "Payme"/"Click").
Nav label: uz "To'lovlar", ru "Платежи", en "Payments".

## Security

- Payme Basic-auth compared with `timingSafeEqual`; Click md5 signature verified
  before any DB access; both reject unknown invoices and amount mismatches.
- Webhook handlers are idempotent (unique `(provider, providerTransactionId)`)
  and wrapped in transactions so double-delivery cannot double-settle.
- Sandbox endpoints fail closed in production.
- Callback payloads are stored in `rawPayload` for audit; settlement transitions
  are also written to the audit log (`payment.performed`, `payment.cancelled`).

## Verification

- `pnpm --filter @kichkintoy/api typecheck`, `pnpm --filter @kichkintoy/web typecheck`,
  `pnpm --filter @kichkintoy/shared typecheck`, `pnpm --filter @kichkintoy/translations build` (if applicable).
- Manual: sandbox flow end to end in the browser; Payme/Click callbacks exercised
  with `curl` fixtures (create → perform → check; prepare → complete) once
  credentials arrive, the Payme sandbox (test.paycom.uz) can run against the same
  endpoint unchanged.
