-- Special Classes / Development Portfolio

CREATE TABLE "special_subjects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "icon" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "specialist_teachers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "full_name" TEXT NOT NULL,
  "phone" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "specialist_teachers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "special_class_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "specialist_teacher_id" UUID,
  "weekday" INTEGER NOT NULL,
  "start_time" TIME(6) NOT NULL,
  "end_time" TIME(6) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "status" TEXT NOT NULL DEFAULT 'active',
  "payroll_type" TEXT NOT NULL DEFAULT 'per_session',
  "payroll_amount" INTEGER NOT NULL DEFAULT 0,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_class_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "special_class_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "schedule_id" UUID,
  "specialist_teacher_id" UUID,
  "session_date" DATE NOT NULL,
  "started_at" TIMESTAMPTZ(6),
  "ended_at" TIMESTAMPTZ(6),
  "title" TEXT NOT NULL,
  "class_summary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "specialist_attendance_status" TEXT NOT NULL DEFAULT 'present',
  "payroll_status" TEXT NOT NULL DEFAULT 'draft',
  "payroll_amount" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMPTZ(6),
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_class_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "special_class_session_media" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "media_asset_id" UUID NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'session_children',
  "field_note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_class_session_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "special_class_media_children" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_media_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_class_media_children_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "special_class_child_observations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "participation" TEXT NOT NULL DEFAULT 'normal',
  "progress_level" TEXT NOT NULL DEFAULT 'improving',
  "interest_level" TEXT NOT NULL DEFAULT 'medium',
  "strong_skill_keys" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "needs_practice_skill_keys" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "teacher_note" TEXT,
  "home_practice" TEXT,
  "visible_to_parent" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_class_child_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "special_subject_rubrics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "age_group" TEXT NOT NULL,
  "skill_key" TEXT NOT NULL,
  "skill_label" TEXT NOT NULL,
  "description" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "special_subject_rubrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "special_class_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "author_user_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'parent_teacher',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "special_class_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monthly_development_summaries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "month" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "structured_summary" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ai_summary_text" TEXT,
  "staff_edited_summary_text" TEXT,
  "approved_summary_text" TEXT,
  "ai_provider" TEXT,
  "ai_model" TEXT,
  "generated_at" TIMESTAMPTZ(6),
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monthly_development_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "development_portfolio_exports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "month" TEXT,
  "term_label" TEXT,
  "media_asset_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "generated_by_user_id" UUID NOT NULL,
  "generated_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "development_portfolio_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "special_subjects_center_id_status_name_idx"
  ON "special_subjects"("center_id", "status", "name");

CREATE INDEX "specialist_teachers_center_id_status_full_name_idx"
  ON "specialist_teachers"("center_id", "status", "full_name");

CREATE INDEX "special_class_schedules_center_id_status_weekday_idx"
  ON "special_class_schedules"("center_id", "status", "weekday");
CREATE INDEX "special_class_schedules_class_id_status_weekday_idx"
  ON "special_class_schedules"("class_id", "status", "weekday");
CREATE INDEX "special_class_schedules_subject_id_idx"
  ON "special_class_schedules"("subject_id");
CREATE INDEX "special_class_schedules_specialist_teacher_id_idx"
  ON "special_class_schedules"("specialist_teacher_id");

CREATE INDEX "special_class_sessions_center_id_session_date_idx"
  ON "special_class_sessions"("center_id", "session_date" DESC);
CREATE INDEX "special_class_sessions_class_id_session_date_idx"
  ON "special_class_sessions"("class_id", "session_date" DESC);
CREATE INDEX "special_class_sessions_subject_id_idx"
  ON "special_class_sessions"("subject_id");
CREATE INDEX "special_class_sessions_schedule_id_idx"
  ON "special_class_sessions"("schedule_id");

CREATE UNIQUE INDEX "special_class_session_media_session_id_media_asset_id_key"
  ON "special_class_session_media"("session_id", "media_asset_id");
CREATE INDEX "special_class_session_media_media_asset_id_idx"
  ON "special_class_session_media"("media_asset_id");

CREATE UNIQUE INDEX "special_class_media_children_session_media_id_child_id_key"
  ON "special_class_media_children"("session_media_id", "child_id");
CREATE INDEX "special_class_media_children_child_id_idx"
  ON "special_class_media_children"("child_id");

CREATE UNIQUE INDEX "special_class_child_observations_session_id_child_id_key"
  ON "special_class_child_observations"("session_id", "child_id");
CREATE INDEX "special_class_child_observations_child_id_idx"
  ON "special_class_child_observations"("child_id");

CREATE UNIQUE INDEX "special_subject_rubrics_subject_id_age_group_skill_key_key"
  ON "special_subject_rubrics"("subject_id", "age_group", "skill_key");
CREATE INDEX "special_subject_rubrics_center_id_subject_id_age_group_idx"
  ON "special_subject_rubrics"("center_id", "subject_id", "age_group");

CREATE INDEX "special_class_comments_session_id_child_id_created_at_idx"
  ON "special_class_comments"("session_id", "child_id", "created_at");
CREATE INDEX "special_class_comments_author_user_id_idx"
  ON "special_class_comments"("author_user_id");

CREATE UNIQUE INDEX "monthly_development_summaries_child_id_month_key"
  ON "monthly_development_summaries"("child_id", "month");
CREATE INDEX "monthly_development_summaries_center_id_month_idx"
  ON "monthly_development_summaries"("center_id", "month");

CREATE INDEX "development_portfolio_exports_center_id_child_id_created_at_idx"
  ON "development_portfolio_exports"("center_id", "child_id", "created_at");
CREATE INDEX "development_portfolio_exports_media_asset_id_idx"
  ON "development_portfolio_exports"("media_asset_id");

ALTER TABLE "special_subjects"
  ADD CONSTRAINT "special_subjects_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_subjects_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "specialist_teachers"
  ADD CONSTRAINT "specialist_teachers_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "special_class_schedules"
  ADD CONSTRAINT "special_class_schedules_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_schedules_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_schedules_subject_id_fkey"
  FOREIGN KEY ("subject_id") REFERENCES "special_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_schedules_specialist_teacher_id_fkey"
  FOREIGN KEY ("specialist_teacher_id") REFERENCES "specialist_teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_schedules_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "special_class_sessions"
  ADD CONSTRAINT "special_class_sessions_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_sessions_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_sessions_subject_id_fkey"
  FOREIGN KEY ("subject_id") REFERENCES "special_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_sessions_schedule_id_fkey"
  FOREIGN KEY ("schedule_id") REFERENCES "special_class_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_sessions_specialist_teacher_id_fkey"
  FOREIGN KEY ("specialist_teacher_id") REFERENCES "specialist_teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_sessions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_sessions_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "special_class_session_media"
  ADD CONSTRAINT "special_class_session_media_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "special_class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_session_media_media_asset_id_fkey"
  FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "special_class_media_children"
  ADD CONSTRAINT "special_class_media_children_session_media_id_fkey"
  FOREIGN KEY ("session_media_id") REFERENCES "special_class_session_media"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_media_children_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "special_class_child_observations"
  ADD CONSTRAINT "special_class_child_observations_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "special_class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_child_observations_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "special_subject_rubrics"
  ADD CONSTRAINT "special_subject_rubrics_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_subject_rubrics_subject_id_fkey"
  FOREIGN KEY ("subject_id") REFERENCES "special_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "special_class_comments"
  ADD CONSTRAINT "special_class_comments_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "special_class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_comments_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "special_class_comments_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "monthly_development_summaries"
  ADD CONSTRAINT "monthly_development_summaries_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "monthly_development_summaries_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "monthly_development_summaries_approved_by_user_id_fkey"
  FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "development_portfolio_exports"
  ADD CONSTRAINT "development_portfolio_exports_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "development_portfolio_exports_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "development_portfolio_exports_media_asset_id_fkey"
  FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "development_portfolio_exports_generated_by_user_id_fkey"
  FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
