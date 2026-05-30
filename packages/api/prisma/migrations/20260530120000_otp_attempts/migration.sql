-- Add a failed-attempt counter to phone verifications for OTP brute-force lockout.
ALTER TABLE "phone_verifications" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
