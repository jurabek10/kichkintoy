ALTER TABLE "conversation_threads"
  ADD COLUMN "last_message_kind" TEXT;

UPDATE "conversation_threads"
SET "last_message_kind" = 'text'
WHERE "last_message_at" IS NOT NULL;
