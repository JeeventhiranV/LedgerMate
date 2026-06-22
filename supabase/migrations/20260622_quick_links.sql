-- Quick Links Manager: lm_quick_links + lm_ql_config
CREATE TABLE IF NOT EXISTS lm_quick_links (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code             TEXT,
  title            TEXT        NOT NULL,
  url              TEXT        NOT NULL,
  category_code    TEXT,
  subcategory_code TEXT,
  source_type      TEXT,
  technology       TEXT,
  description      TEXT,
  priority         TEXT        NOT NULL DEFAULT 'medium',
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  is_favourite     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_pinned        BOOLEAN     NOT NULL DEFAULT FALSE,
  usage_count      INT         NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lm_ql_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_type TEXT        NOT NULL,
  code        TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  parent_code TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, config_type, code)
);

CREATE INDEX IF NOT EXISTS idx_ql_links_user   ON lm_quick_links (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ql_links_fav    ON lm_quick_links (user_id, is_favourite) WHERE is_favourite = TRUE;
CREATE INDEX IF NOT EXISTS idx_ql_config_user  ON lm_ql_config (user_id, config_type, sort_order);

ALTER TABLE lm_quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE lm_ql_config   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ql_links_select" ON lm_quick_links FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "ql_links_insert" ON lm_quick_links FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ql_links_update" ON lm_quick_links FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "ql_links_delete" ON lm_quick_links FOR DELETE  USING (auth.uid() = user_id);

CREATE POLICY "ql_config_select" ON lm_ql_config FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "ql_config_insert" ON lm_ql_config FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ql_config_update" ON lm_ql_config FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "ql_config_delete" ON lm_ql_config FOR DELETE  USING (auth.uid() = user_id);
