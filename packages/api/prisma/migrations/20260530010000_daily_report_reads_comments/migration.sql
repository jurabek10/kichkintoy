-- Daily report read receipts and comments.

CREATE TABLE "daily_report_reads" (
    "id" UUID NOT NULL,
    "daily_report_id" UUID NOT NULL,
    "guardian_user_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_reads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_report_comments" (
    "id" UUID NOT NULL,
    "daily_report_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_comments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_report_reads_daily_report_id_guardian_user_id_key"
  ON "daily_report_reads"("daily_report_id", "guardian_user_id");

CREATE INDEX "daily_report_reads_daily_report_id_idx"
  ON "daily_report_reads"("daily_report_id");

CREATE INDEX "daily_report_comments_daily_report_id_created_at_idx"
  ON "daily_report_comments"("daily_report_id", "created_at");

ALTER TABLE "daily_report_reads"
  ADD CONSTRAINT "daily_report_reads_daily_report_id_fkey"
  FOREIGN KEY ("daily_report_id") REFERENCES "daily_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_report_reads"
  ADD CONSTRAINT "daily_report_reads_guardian_user_id_fkey"
  FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "daily_report_comments"
  ADD CONSTRAINT "daily_report_comments_daily_report_id_fkey"
  FOREIGN KEY ("daily_report_id") REFERENCES "daily_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_report_comments"
  ADD CONSTRAINT "daily_report_comments_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "daily_report_comments"
  ADD CONSTRAINT "daily_report_comments_parent_comment_id_fkey"
  FOREIGN KEY ("parent_comment_id") REFERENCES "daily_report_comments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
