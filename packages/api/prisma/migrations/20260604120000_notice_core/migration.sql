ALTER TABLE "notices"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'announcement',
  ADD COLUMN "requires_confirmation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allow_comments" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_important" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "survey_question" TEXT,
  ADD COLUMN "survey_multi_select" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "survey_anonymous" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "survey_deadline" TIMESTAMPTZ,
  ADD COLUMN "last_nudged_at" TIMESTAMPTZ;

CREATE TABLE "notice_targets" (
  "id" UUID NOT NULL,
  "notice_id" UUID NOT NULL,
  "target_kind" TEXT NOT NULL,
  "target_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notice_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notice_targets_notice_id_target_kind_target_id_key"
  ON "notice_targets"("notice_id", "target_kind", "target_id");

CREATE INDEX "notice_targets_notice_id_idx"
  ON "notice_targets"("notice_id");

ALTER TABLE "notice_targets"
  ADD CONSTRAINT "notice_targets_notice_id_fkey"
  FOREIGN KEY ("notice_id") REFERENCES "notices"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
