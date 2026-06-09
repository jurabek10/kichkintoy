CREATE TABLE "student_document_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "template_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "fields" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "student_document_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_document_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "target_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "due_date" DATE,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "sent_at" TIMESTAMPTZ(6),
  "closed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_document_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_document_request_classes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_document_request_classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_document_request_children" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_document_request_children_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_document_submissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "center_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "submitted_by_user_id" UUID,
  "reviewed_by_user_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "answers" JSONB NOT NULL DEFAULT '{}',
  "correction_note" TEXT,
  "submitted_at" TIMESTAMPTZ(6),
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_document_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_document_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" UUID NOT NULL,
  "media_asset_id" UUID NOT NULL,
  "field_key" TEXT NOT NULL,
  "original_filename" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_document_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_document_templates_center_id_status_idx" ON "student_document_templates"("center_id", "status");
CREATE INDEX "student_document_requests_center_id_status_due_date_idx" ON "student_document_requests"("center_id", "status", "due_date");
CREATE INDEX "student_document_requests_template_id_idx" ON "student_document_requests"("template_id");
CREATE UNIQUE INDEX "student_document_request_classes_request_id_class_id_key" ON "student_document_request_classes"("request_id", "class_id");
CREATE INDEX "student_document_request_classes_class_id_idx" ON "student_document_request_classes"("class_id");
CREATE UNIQUE INDEX "student_document_request_children_request_id_child_id_key" ON "student_document_request_children"("request_id", "child_id");
CREATE INDEX "student_document_request_children_child_id_idx" ON "student_document_request_children"("child_id");
CREATE UNIQUE INDEX "student_document_submissions_request_id_child_id_key" ON "student_document_submissions"("request_id", "child_id");
CREATE INDEX "student_document_submissions_center_id_status_idx" ON "student_document_submissions"("center_id", "status");
CREATE INDEX "student_document_submissions_child_id_status_idx" ON "student_document_submissions"("child_id", "status");
CREATE UNIQUE INDEX "student_document_attachments_submission_id_media_asset_id_key" ON "student_document_attachments"("submission_id", "media_asset_id");
CREATE INDEX "student_document_attachments_submission_id_position_idx" ON "student_document_attachments"("submission_id", "position");

ALTER TABLE "student_document_templates" ADD CONSTRAINT "student_document_templates_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_templates" ADD CONSTRAINT "student_document_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_requests" ADD CONSTRAINT "student_document_requests_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_requests" ADD CONSTRAINT "student_document_requests_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "student_document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_requests" ADD CONSTRAINT "student_document_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_request_classes" ADD CONSTRAINT "student_document_request_classes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "student_document_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_document_request_classes" ADD CONSTRAINT "student_document_request_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_request_children" ADD CONSTRAINT "student_document_request_children_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "student_document_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_document_request_children" ADD CONSTRAINT "student_document_request_children_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_submissions" ADD CONSTRAINT "student_document_submissions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "student_document_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_submissions" ADD CONSTRAINT "student_document_submissions_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_submissions" ADD CONSTRAINT "student_document_submissions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_document_submissions" ADD CONSTRAINT "student_document_submissions_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_document_submissions" ADD CONSTRAINT "student_document_submissions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_document_attachments" ADD CONSTRAINT "student_document_attachments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "student_document_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_document_attachments" ADD CONSTRAINT "student_document_attachments_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
