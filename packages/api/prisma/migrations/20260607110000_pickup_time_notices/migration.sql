CREATE TABLE "pickup_time_notices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "center_id" UUID NOT NULL,
    "class_id" UUID,
    "child_id" UUID NOT NULL,
    "parent_user_id" UUID NOT NULL,
    "pickup_date" DATE NOT NULL,
    "pickup_time" TEXT NOT NULL,
    "pickup_person_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "acknowledged_by_id" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_time_notices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pickup_time_notices_center_id_pickup_date_status_idx" ON "pickup_time_notices"("center_id", "pickup_date", "status");
CREATE INDEX "pickup_time_notices_class_id_pickup_date_status_idx" ON "pickup_time_notices"("class_id", "pickup_date", "status");
CREATE INDEX "pickup_time_notices_child_id_pickup_date_idx" ON "pickup_time_notices"("child_id", "pickup_date");
CREATE INDEX "pickup_time_notices_parent_user_id_pickup_date_idx" ON "pickup_time_notices"("parent_user_id", "pickup_date");

ALTER TABLE "pickup_time_notices" ADD CONSTRAINT "pickup_time_notices_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_time_notices" ADD CONSTRAINT "pickup_time_notices_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pickup_time_notices" ADD CONSTRAINT "pickup_time_notices_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_time_notices" ADD CONSTRAINT "pickup_time_notices_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_time_notices" ADD CONSTRAINT "pickup_time_notices_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
