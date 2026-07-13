ALTER TABLE "media_assets"
  ADD COLUMN "original_file_name" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
