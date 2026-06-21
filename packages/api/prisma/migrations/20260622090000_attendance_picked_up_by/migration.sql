-- Add the person who picked the child up, recorded at check-out and shown to parents.
ALTER TABLE "attendance_records"
  ADD COLUMN IF NOT EXISTS "picked_up_by" TEXT,
  ADD COLUMN IF NOT EXISTS "picked_up_relationship" TEXT;
