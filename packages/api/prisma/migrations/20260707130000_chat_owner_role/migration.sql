-- Generalize AI chat threads from parent-only to any owner role.
-- The owner's role (parent/teacher/director) selects the scoped toolset and
-- keeps a dual-role user's threads separate. Existing rows are all parents.

DO $$ BEGIN
  CREATE TYPE chat_owner_role AS ENUM ('parent', 'teacher', 'director');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE chat_threads RENAME COLUMN parent_user_id TO owner_user_id;

ALTER TABLE chat_threads
  ADD COLUMN IF NOT EXISTS owner_role chat_owner_role NOT NULL DEFAULT 'parent';

DROP INDEX IF EXISTS idx_chat_threads_parent;

CREATE INDEX IF NOT EXISTS idx_chat_threads_owner
  ON chat_threads(owner_user_id, owner_role, updated_at);
