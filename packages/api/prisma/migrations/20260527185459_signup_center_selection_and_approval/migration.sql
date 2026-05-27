-- CreateTable
CREATE TABLE "center_invite_codes" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "center_invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "center_invite_codes_code_key" ON "center_invite_codes"("code");

-- CreateIndex
CREATE INDEX "center_invite_codes_center_id_kind_idx" ON "center_invite_codes"("center_id", "kind");

-- AddForeignKey
ALTER TABLE "center_invite_codes" ADD CONSTRAINT "center_invite_codes_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_invite_codes" ADD CONSTRAINT "center_invite_codes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "center_invite_codes"
    ADD CONSTRAINT "center_invite_codes_kind_check"
    CHECK ("kind" IN ('teacher', 'director'));

-- AlterTable: relax child_name and add new columns
ALTER TABLE "center_join_requests" ALTER COLUMN "child_name" DROP NOT NULL;

ALTER TABLE "center_join_requests"
    ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'parent',
    ADD COLUMN "child_photo_url" TEXT,
    ADD COLUMN "parent_relationship" TEXT,
    ADD COLUMN "custom_relationship_label" TEXT,
    ADD COLUMN "invite_code_id" UUID,
    ADD COLUMN "reviewer_message" TEXT,
    ADD COLUMN "cancelled_at" TIMESTAMPTZ(6);

-- AddCheckConstraint
ALTER TABLE "center_join_requests"
    ADD CONSTRAINT "center_join_requests_kind_check"
    CHECK ("kind" IN ('parent', 'teacher', 'director'));

-- AddForeignKey
ALTER TABLE "center_join_requests" ADD CONSTRAINT "center_join_requests_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "center_invite_codes"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- CreateIndex: composite for director inbox
CREATE INDEX "center_join_requests_center_id_status_created_at_idx" ON "center_join_requests"("center_id", "status", "created_at" DESC);
