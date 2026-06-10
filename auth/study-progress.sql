-- ═══════════════════════════════════════════════════════════════════════════
--  STUDY PROGRESS — Supabase Setup SQL
--  Run in: Supabase Dashboard → SQL Editor → New query → Run All
--  Run AFTER setup.sql
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Per-item progress table ─────────────────────────────────────────────
--  Stores status / favorite / note for each question or PDF per user per module.
--  module values: 'java' | 'dsa' | 'react' | 'hr' | 'ipk'
--  item_id: question index (as text) or PDF id string

CREATE TABLE IF NOT EXISTS public.study_progress (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module            text        NOT NULL,
  item_id           text        NOT NULL,
  status            text,                   -- 'done' | 'inprogress' | NULL
  is_fav            boolean     NOT NULL DEFAULT false,
  note              text,
  status_changed_at timestamptz,            -- set only when status changes
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module, item_id)
);

-- If upgrading an existing installation, add the column without recreating:
-- ALTER TABLE public.study_progress ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study progress"
  ON public.study_progress
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS study_progress_user_module_idx
  ON public.study_progress (user_id, module);


-- ─── 2. Daily streak table ───────────────────────────────────────────────────
--  One row per user. Updated whenever they visit any prep page.

CREATE TABLE IF NOT EXISTS public.study_streak (
  user_id    uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_date  date,
  streak     int     NOT NULL DEFAULT 0,
  longest    int     NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_streak ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own streak"
  ON public.study_streak
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
