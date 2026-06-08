ALTER TABLE "attendance_records"
  ADD COLUMN IF NOT EXISTS "absence_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "parent_visible_note" TEXT;

ALTER TABLE "attendance_records"
  ALTER COLUMN "status" SET DEFAULT 'not_checked_in';

DROP INDEX IF EXISTS "attendance_records_center_id_idx";
DROP INDEX IF EXISTS "attendance_records_class_id_idx";

CREATE INDEX IF NOT EXISTS "attendance_records_center_id_attendance_date_status_idx"
  ON "attendance_records"("center_id", "attendance_date", "status");

CREATE INDEX IF NOT EXISTS "attendance_records_class_id_attendance_date_status_idx"
  ON "attendance_records"("class_id", "attendance_date", "status");

CREATE INDEX IF NOT EXISTS "attendance_records_child_id_attendance_date_idx"
  ON "attendance_records"("child_id", "attendance_date");
