ALTER TABLE "users" ADD COLUMN "telegram_id" BIGINT, ADD COLUMN "telegram_username" TEXT;
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

CREATE TABLE "family_invitations" (
  "id" UUID NOT NULL, "invited_by_user_id" UUID NOT NULL, "relationship" TEXT NOT NULL,
  "code" TEXT NOT NULL, "preferred_language" TEXT, "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6), "accepted_by_user_id" UUID, "telegram_user_id" BIGINT,
  "revoked_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "family_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "family_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "family_invitations_invited_by_user_id_created_at_idx" ON "family_invitations"("invited_by_user_id", "created_at" DESC);
CREATE INDEX "family_invitations_code_idx" ON "family_invitations"("code");

CREATE TABLE "telegram_login_nonces" (
  "id" UUID NOT NULL, "nonce_hash" TEXT NOT NULL, "user_id" UUID, "approved_at" TIMESTAMPTZ(6),
  "consumed_at" TIMESTAMPTZ(6), "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "telegram_login_nonces_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "telegram_login_nonces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "telegram_login_nonces_nonce_hash_key" ON "telegram_login_nonces"("nonce_hash");
