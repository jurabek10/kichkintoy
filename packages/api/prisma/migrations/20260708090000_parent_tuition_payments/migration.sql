-- AlterTable
ALTER TABLE "centers" ADD COLUMN     "monthly_tuition_uzs" DECIMAL(14,2) NOT NULL DEFAULT 1000000;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "cancel_reason" INTEGER,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "provider_state" INTEGER,
ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "payments_seq_key" ON "payments"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_transaction_id_key" ON "payments"("provider", "provider_transaction_id");

