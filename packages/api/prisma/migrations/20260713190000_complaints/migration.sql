CREATE TABLE "complaints" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "center_id" UUID NOT NULL,
  "class_id" UUID,
  "child_id" UUID NOT NULL,
  "parent_user_id" UUID NOT NULL,
  "category" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'teacher_and_director',
  "status" TEXT NOT NULL DEFAULT 'open',
  "resolved_by_user_id" UUID,
  "resolved_at" TIMESTAMPTZ(6),
  "resolution_note" TEXT,
  "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "complaints_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "complaints_category_check" CHECK ("category" IN ('meals','safety','staff_behavior','fees','facility','health','curriculum','other')),
  CONSTRAINT "complaints_visibility_check" CHECK ("visibility" IN ('teacher_and_director','director_only')),
  CONSTRAINT "complaints_status_check" CHECK ("status" IN ('open','in_progress','resolved','withdrawn'))
);

CREATE TABLE "complaint_replies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "complaint_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "complaint_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_status_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "complaint_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "from_status" TEXT NOT NULL,
  "to_status" TEXT NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "complaint_status_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "complaint_status_events_from_check" CHECK ("from_status" IN ('open','in_progress','resolved','withdrawn')),
  CONSTRAINT "complaint_status_events_to_check" CHECK ("to_status" IN ('open','in_progress','resolved','withdrawn'))
);

CREATE INDEX "complaints_center_id_status_last_activity_at_idx" ON "complaints"("center_id", "status", "last_activity_at");
CREATE INDEX "complaints_class_id_visibility_status_idx" ON "complaints"("class_id", "visibility", "status");
CREATE INDEX "complaints_parent_user_id_created_at_idx" ON "complaints"("parent_user_id", "created_at");
CREATE INDEX "complaint_replies_complaint_id_created_at_idx" ON "complaint_replies"("complaint_id", "created_at");
CREATE INDEX "complaint_status_events_complaint_id_created_at_idx" ON "complaint_status_events"("complaint_id", "created_at");

ALTER TABLE "complaints" ADD CONSTRAINT "complaints_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaint_replies" ADD CONSTRAINT "complaint_replies_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_replies" ADD CONSTRAINT "complaint_replies_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_status_events" ADD CONSTRAINT "complaint_status_events_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_status_events" ADD CONSTRAINT "complaint_status_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
