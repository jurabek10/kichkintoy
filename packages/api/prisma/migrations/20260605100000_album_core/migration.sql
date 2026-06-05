ALTER TABLE album_posts
  ADD COLUMN IF NOT EXISTS caption TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'class',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE album_posts
SET
  caption = COALESCE(NULLIF(body, ''), NULLIF(title, ''), caption),
  status = CASE WHEN published_at IS NULL THEN 'draft' ELSE 'published' END
WHERE caption = '';

CREATE INDEX IF NOT EXISTS idx_album_posts_center_status
  ON album_posts(center_id, status, published_at DESC);

CREATE TABLE IF NOT EXISTS album_post_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_album_post_classes_class
  ON album_post_classes(class_id);

INSERT INTO album_post_classes (post_id, class_id)
SELECT id, class_id
FROM album_posts
WHERE class_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS album_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  caption TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, media_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_album_media_post_position
  ON album_media(post_id, position);

CREATE TABLE IF NOT EXISTS album_media_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES album_media(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_album_media_children_child
  ON album_media_children(child_id);

CREATE INDEX IF NOT EXISTS idx_album_post_children_child
  ON album_post_children(child_id);

CREATE TABLE IF NOT EXISTS album_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_comments_post
  ON album_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS album_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES album_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'heart',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_album_reactions_post
  ON album_reactions(post_id);
