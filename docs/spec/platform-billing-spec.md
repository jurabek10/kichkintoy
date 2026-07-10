# Platform Billing (Founder Payments) — Spec

A single **payments page** for the founder (CEO, `super_admin`) that calculates, for every
center, how much that center owes the platform each month — and lists them all with a grand
total. This is **platform → center** money (the center's subscription to Kichkintoy),
entirely separate from **parent → center tuition** (the existing `Invoice`/`Payment`).

**Privacy rule (unchanged):** counts and amounts only — never child/teacher names.

## The calculation

For each center: **`total = baseFeeUzs + kidCount × perKidFeeUzs`**, where

- `baseFeeUzs` and `perKidFeeUzs` are **per-center** and editable (e.g. base 300.000 or
  200.000; per-kid 20.000 or 40.000). New centers default to **300.000 base / 30.000 kid**.
- `kidCount` = children with an **active enrollment** right now (live count).
- Each center also has a **payment day** (1–28) — the day of the month it pays the founder.
  Set it when creating/editing a center, or from the billing edit dialog.

## Monthly status (paid / due / overdue)

Tracked as **one payment record per center per month** (`CenterPlatformPayment`, unique on
`centerId + periodMonth`). Its existence means "paid for that month", so status **resets
automatically** each period and payment history is kept.

- **paid** — a record exists for the current month.
- **overdue** — unpaid and today is past the center's payment day.
- **due** — unpaid and still within the payment day.

The founder flips a center's current-month status from the billing page (**Mark paid** /
**Unpaid**); marking paid snapshots the owed amount and records who/when.

## Page — `/admin/billing`

- Summary tiles for the current month: **Expected**, **Collected**, **Outstanding**.
- TanStack Table, 10/page, row numbers, no horizontal scroll:
  - Columns: №, Center (name + code), Base fee, Per-kid fee, Kids, Payment day,
    **Total to pay**, Status.
  - Search by center name/code.
  - Row actions: **Mark paid / Unpaid** toggle; **Edit rates** dialog (base, per-kid,
    payment day).
- Money `300.000 so'm`, Asia/Tashkent; reuse `formatMoney`, `DataTable`, the admin theme.
- Add **"Billing"** to the admin sidebar nav.

## Data model

- **`Center`** columns: `platformBaseFeeUzs` (default 300000), `platformPerKidFeeUzs`
  (default 30000), `platformBillingDay` (default 1). Amounts `Decimal(14,2)` UZS.
- **`CenterPlatformPayment`**: `centerId`, `periodMonth` (DATE, first of month),
  `amountUzs` (snapshot), `paidAt`, `recordedByUserId`, `note?`. Unique on
  `(centerId, periodMonth)`. Totals are computed live; only paid months are persisted.

## API (extend the `admin` oRPC contract, behind the super_admin guard)

- `admin.billing.list` → `{ period, rows[{ id, name, centerCode, baseFeeUzs, perKidFeeUzs,
  billingDay, kidCount, total, status, paidAt }], grandTotal, collected, outstanding }`.
- `admin.billing.setPricing` → `{ centerId, baseFeeUzs, perKidFeeUzs, billingDay }`.
- `admin.billing.setPaid` → `{ centerId, paid, note? }` (marks the current month).
- Center pricing + payment day are also settable via `admin.centers.create` /
  `admin.centers.update` (added to `adminCenterFieldsSchema`).

Audit-logged: `center.billing.updated`, `center.billing.paid`, `center.billing.unpaid`.
Amounts + counts only.

## Out of scope (v1)

Multi-month invoice line items, online payment (Payme/Click), partial payments, waive/pause
states, proration, PDFs/receipts, overdue reminders, mobile. (The earlier heavier
invoice-tracking design is kept in git history if we want it later.)
