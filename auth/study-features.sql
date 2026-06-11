-- ══════════════════════════════════════════════════════════════════════════
--  StudyFeatures — Additional Supabase tables & functions
--  Run once in the Supabase SQL editor after study-progress.sql
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Custom Playlists ───────────────────────────────────────────────────
--  Each row is one playlist owned by one user.
--  `items` is a JSON array: [{module: "dsa", id: "a1"}, ...]
CREATE TABLE IF NOT EXISTS public.study_playlists (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  items      JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.study_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own playlists"
  ON public.study_playlists FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_playlists_user
  ON public.study_playlists (user_id);

-- ── 2. Daily Goals ────────────────────────────────────────────────────────
--  One row per user per module — stores the target count.
--  Progress is computed at runtime from study_progress rows updated today.
CREATE TABLE IF NOT EXISTS public.study_goals (
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module       TEXT    NOT NULL,
  daily_target INTEGER NOT NULL DEFAULT 5
    CHECK (daily_target BETWEEN 1 AND 50),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, module)
);

ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals"
  ON public.study_goals FOR ALL
  USING (auth.uid() = user_id);

-- ── 3. Anonymised Leaderboard ─────────────────────────────────────────────
--  Returns the top-20 completion counts for a given module.
--  Callers only see: rank, done_count, is_me (TRUE for own row).
CREATE OR REPLACE FUNCTION public.study_leaderboard(p_module TEXT)
RETURNS TABLE (
  rank       BIGINT,
  done_count BIGINT,
  is_me      BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY done_count DESC) AS rank,
    done_count,
    (user_id = auth.uid()) AS is_me
  FROM (
    SELECT
      user_id,
      COUNT(*) FILTER (WHERE status = 'done') AS done_count
    FROM public.study_progress
    WHERE module = p_module
    GROUP BY user_id
    HAVING COUNT(*) FILTER (WHERE status = 'done') > 0
  ) sub
  ORDER BY done_count DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.study_leaderboard(TEXT) TO authenticated;

-- ── 4. Revision-reminder helper ───────────────────────────────────────────
--  Returns TRUE if the user has not marked anything as done in the past
--  `threshold_days` days for the given module. Used by the front-end to
--  decide whether to show a reminder banner.
CREATE OR REPLACE FUNCTION public.study_needs_reminder(
  p_module        TEXT,
  p_threshold_days INTEGER DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.study_progress
    WHERE user_id = auth.uid()
      AND module   = p_module
      AND status   = 'done'
      AND status_changed_at >= (now() - (p_threshold_days || ' days')::INTERVAL)
  );
$$;

GRANT EXECUTE ON FUNCTION public.study_needs_reminder(TEXT, INTEGER) TO authenticated;
