CREATE TABLE meal_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES centers(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'class',
  menu_text TEXT NOT NULL,
  allergy_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_posts_center_date
  ON meal_posts(center_id, meal_date DESC);

CREATE INDEX idx_meal_posts_status
  ON meal_posts(status, published_at DESC);

CREATE TABLE meal_post_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_post_id UUID NOT NULL REFERENCES meal_posts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meal_post_id, class_id)
);

CREATE INDEX idx_meal_post_classes_class
  ON meal_post_classes(class_id);

CREATE TABLE meal_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_post_id UUID NOT NULL REFERENCES meal_posts(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meal_post_id, media_asset_id)
);

CREATE INDEX idx_meal_post_media_post
  ON meal_post_media(meal_post_id, position);

CREATE TABLE meal_child_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_post_id UUID NOT NULL REFERENCES meal_posts(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id),
  status TEXT NOT NULL,
  note TEXT,
  recorded_by_user_id UUID NOT NULL REFERENCES users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meal_post_id, child_id)
);

CREATE INDEX idx_meal_child_statuses_child
  ON meal_child_statuses(child_id);
