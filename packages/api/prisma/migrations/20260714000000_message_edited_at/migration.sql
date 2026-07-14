-- Track when a message was last edited by its sender (48h edit window).
ALTER TABLE "messages"
  ADD COLUMN "edited_at" TIMESTAMPTZ(6);
