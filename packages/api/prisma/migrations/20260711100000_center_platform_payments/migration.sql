-- Payment date per center + monthly platform-payment tracking (founder billing).
ALTER TABLE "centers"
    ADD COLUMN "platform_billing_day" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS center_platform_payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id           UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    period_month        DATE NOT NULL,
    amount_uzs          DECIMAL(14,2) NOT NULL,
    paid_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by_user_id UUID NOT NULL,
    note                TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (center_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_center_platform_payments_center
    ON center_platform_payments(center_id);
