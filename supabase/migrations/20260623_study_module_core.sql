-- =============================================================================
-- Migration: 20260623_study_module_core.sql
-- Description: Core schema, indexes, and RLS policies for the Study Module:
--   1. study_progress: Item-level question status, favorites, and notes
--   2. study_streak: Daily study activity streaks and records
--   3. study_quiz_attempts: Timed quiz performance and score history
--   4. study_custom_notes: Personal study notebooks and topic summaries
-- =============================================================================

-- 1. Study Progress Table
CREATE TABLE IF NOT EXISTS study_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module            TEXT        NOT NULL, -- 'java', 'dsacode', 'lld', 'react', 'hr', 'ipk'
  item_id           TEXT        NOT NULL, -- question index or topic slug
  status            TEXT,                 -- 'done', 'inprogress', NULL (cleared)
  is_fav            BOOLEAN     NOT NULL DEFAULT FALSE,
  note              TEXT,
  status_changed_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module, item_id)
);

CREATE INDEX IF NOT EXISTS idx_study_progress_user_mod
  ON study_progress (user_id, module, status_changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_progress_fav
  ON study_progress (user_id, is_fav) WHERE is_fav = TRUE;

ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_progress_select" ON study_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "study_progress_insert" ON study_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_progress_update" ON study_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "study_progress_delete" ON study_progress FOR DELETE USING (auth.uid() = user_id);


-- 2. Study Streak Table
CREATE TABLE IF NOT EXISTS study_streak (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  streak     INT         NOT NULL DEFAULT 1,
  longest    INT         NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_study_streak_user ON study_streak (user_id);

ALTER TABLE study_streak ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_streak_select" ON study_streak FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "study_streak_insert" ON study_streak FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_streak_update" ON study_streak FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "study_streak_delete" ON study_streak FOR DELETE USING (auth.uid() = user_id);


-- 3. Study Quiz & Assessment Attempts
CREATE TABLE IF NOT EXISTS study_quiz_attempts (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module             TEXT        NOT NULL, -- 'java', 'dsacode', 'react', 'lld', 'mixed'
  topic              TEXT        NOT NULL,
  score              INT         NOT NULL DEFAULT 0,
  total_questions    INT         NOT NULL DEFAULT 10,
  time_taken_seconds INT         NOT NULL DEFAULT 0,
  details            JSONB       DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_quiz_user_date
  ON study_quiz_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_quiz_module
  ON study_quiz_attempts (user_id, module);

ALTER TABLE study_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_quiz_select" ON study_quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "study_quiz_insert" ON study_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_quiz_delete" ON study_quiz_attempts FOR DELETE USING (auth.uid() = user_id);


-- 4. Custom Notes & Topic Summaries
CREATE TABLE IF NOT EXISTS study_custom_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module     TEXT        NOT NULL DEFAULT 'general',
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL DEFAULT '',
  tags       TEXT[]      NOT NULL DEFAULT '{}',
  is_pinned  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_notes_user ON study_custom_notes (user_id, is_pinned DESC, updated_at DESC);

ALTER TABLE study_custom_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_notes_select" ON study_custom_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "study_notes_insert" ON study_custom_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_notes_update" ON study_custom_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "study_notes_delete" ON study_custom_notes FOR DELETE USING (auth.uid() = user_id);
