ALTER TABLE "medication_requests"
  ADD COLUMN "symptoms" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "medication_type" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "medication_time" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "medication_count" TEXT,
  ADD COLUMN "storage_method" TEXT,
  ADD COLUMN "special_note" TEXT,
  ADD COLUMN "photo_media_asset_id" UUID,
  ADD COLUMN "photo_caption" TEXT,
  ADD COLUMN "parent_signature" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "administered_dose" TEXT,
  ADD COLUMN "staff_note" TEXT,
  ADD COLUMN "skipped_reason" TEXT,
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "medication_requests_center_id_requested_for_date_idx"
  ON "medication_requests"("center_id", "requested_for_date");

CREATE INDEX "medication_requests_class_id_requested_for_date_idx"
  ON "medication_requests"("class_id", "requested_for_date");

CREATE INDEX "medication_requests_child_id_requested_for_date_idx"
  ON "medication_requests"("child_id", "requested_for_date");

CREATE INDEX "medication_requests_parent_user_id_requested_for_date_idx"
  ON "medication_requests"("parent_user_id", "requested_for_date");

CREATE INDEX "medication_requests_status_requested_for_date_idx"
  ON "medication_requests"("status", "requested_for_date");

ALTER TABLE "medication_requests"
  ADD CONSTRAINT "medication_requests_photo_media_asset_id_fkey"
  FOREIGN KEY ("photo_media_asset_id") REFERENCES "media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
