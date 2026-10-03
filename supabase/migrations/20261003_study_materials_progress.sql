-- =============================================================================
-- Migration: 20261003_study_materials_progress.sql
-- Description: Schema additions for granular file & study material progress tracking,
--              status lifecycle, completion percentage, and last accessed timestamps.
-- =============================================================================

-- 1. Ensure study_materials table has progress and status columns
ALTER TABLE IF EXISTS public.study_materials
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS progress_pct INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_notes TEXT DEFAULT '';

-- 2. Create index on study_materials user and status for fast dashboard rollups
CREATE INDEX IF NOT EXISTS idx_study_materials_user_status
  ON public.study_materials (user_id, status);

CREATE INDEX IF NOT EXISTS idx_study_materials_topic_status
  ON public.study_materials (topic_id, status);
