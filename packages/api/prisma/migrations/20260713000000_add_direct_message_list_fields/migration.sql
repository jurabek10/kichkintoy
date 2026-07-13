ALTER TABLE "conversation_threads"
ADD COLUMN "last_message_at" TIMESTAMPTZ(6),
ADD COLUMN "last_message_preview" TEXT,
ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "conversation_threads_center_id_last_message_at_idx"
ON "conversation_threads"("center_id", "last_message_at");

DROP INDEX IF EXISTS "messages_thread_id_idx";
CREATE INDEX "messages_thread_id_created_at_idx"
ON "messages"("thread_id", "created_at");
