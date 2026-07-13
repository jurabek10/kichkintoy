ALTER TABLE "phone_verifications"
  ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'sms',
  ADD COLUMN "telegram_id" BIGINT,
  ADD COLUMN "telegram_username" TEXT;

ALTER TABLE "telegram_login_nonces"
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'login',
  ADD COLUMN "telegram_id" BIGINT,
  ADD COLUMN "phone_verification_id" UUID;
