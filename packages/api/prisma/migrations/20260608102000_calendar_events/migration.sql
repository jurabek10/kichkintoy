CREATE TABLE "calendar_events" (
  "id" UUID NOT NULL,
  "center_id" UUID NOT NULL,
  "author_user_id" UUID NOT NULL,
  "audience_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location_text" TEXT,
  "starts_at" TIMESTAMPTZ(6) NOT NULL,
  "ends_at" TIMESTAMPTZ(6),
  "all_day" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "cancellation_reason" TEXT,
  "reminder_minutes_before" INTEGER,
  "reminder_sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_event_classes" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_event_classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_event_children" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_event_children_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_event_seen" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_event_seen_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_events_center_id_starts_at_idx" ON "calendar_events"("center_id", "starts_at");
CREATE INDEX "calendar_events_status_starts_at_idx" ON "calendar_events"("status", "starts_at");
CREATE UNIQUE INDEX "calendar_event_classes_event_id_class_id_key" ON "calendar_event_classes"("event_id", "class_id");
CREATE INDEX "calendar_event_classes_class_id_idx" ON "calendar_event_classes"("class_id");
CREATE UNIQUE INDEX "calendar_event_children_event_id_child_id_key" ON "calendar_event_children"("event_id", "child_id");
CREATE INDEX "calendar_event_children_child_id_idx" ON "calendar_event_children"("child_id");
CREATE UNIQUE INDEX "calendar_event_seen_event_id_user_id_key" ON "calendar_event_seen"("event_id", "user_id");
CREATE INDEX "calendar_event_seen_user_id_seen_at_idx" ON "calendar_event_seen"("user_id", "seen_at" DESC);

ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_event_classes" ADD CONSTRAINT "calendar_event_classes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event_classes" ADD CONSTRAINT "calendar_event_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_event_children" ADD CONSTRAINT "calendar_event_children_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event_children" ADD CONSTRAINT "calendar_event_children_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_event_seen" ADD CONSTRAINT "calendar_event_seen_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event_seen" ADD CONSTRAINT "calendar_event_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
