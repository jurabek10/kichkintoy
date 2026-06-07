ALTER TABLE "notifications"
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "metadata" JSONB;

CREATE TABLE "realtime_tickets" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "realtime_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "realtime_tickets_token_hash_key"
  ON "realtime_tickets"("token_hash");

CREATE INDEX "realtime_tickets_user_id_expires_at_idx"
  ON "realtime_tickets"("user_id", "expires_at");

CREATE INDEX "realtime_tickets_expires_at_idx"
  ON "realtime_tickets"("expires_at");

ALTER TABLE "realtime_tickets"
  ADD CONSTRAINT "realtime_tickets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
