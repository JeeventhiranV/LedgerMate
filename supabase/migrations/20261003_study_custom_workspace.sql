-- =============================================================================
-- Migration: 20261003_study_custom_workspace.sql
-- Description: Core schema, tables, indexes, and RLS policies for the
--              Personal Learning & Progress Management System
-- =============================================================================

-- 1. Ensure user_profiles has can_customize_study column
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS can_customize_study BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Custom Learning Domains / Tracks (e.g. Python Backend, AWS Solutions Architect)
CREATE TABLE IF NOT EXISTS public.study_custom_domains (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  icon          TEXT        NOT NULL DEFAULT '📘',
  color         TEXT        NOT NULL DEFAULT '#4f8ef7',
  badge         TEXT        NOT NULL DEFAULT 'Custom Track',
  tagline       TEXT        NOT NULL DEFAULT '',
  target_date   DATE,
  status        TEXT        NOT NULL DEFAULT 'inprogress', -- 'pending' | 'inprogress' | 'completed' | 'onhold'
  order_index   INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_custom_domains_user
  ON public.study_custom_domains (user_id, order_index ASC);

ALTER TABLE public.study_custom_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_custom_domains_all" ON public.study_custom_domains;
CREATE POLICY "study_custom_domains_all" ON public.study_custom_domains
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 3. Custom Categories / Modules under a Domain
CREATE TABLE IF NOT EXISTS public.study_custom_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id     UUID        NOT NULL REFERENCES public.study_custom_domains(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  order_index   INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_custom_categories_domain
  ON public.study_custom_categories (domain_id, order_index ASC);

ALTER TABLE public.study_custom_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_custom_categories_all" ON public.study_custom_categories;
CREATE POLICY "study_custom_categories_all" ON public.study_custom_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 4. Custom Topics & Subtopics
CREATE TABLE IF NOT EXISTS public.study_custom_topics (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id       UUID        NOT NULL REFERENCES public.study_custom_categories(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL DEFAULT '',
  difficulty        TEXT        NOT NULL DEFAULT 'Intermediate', -- 'Beginner' | 'Intermediate' | 'Advanced'
  priority          TEXT        NOT NULL DEFAULT 'Medium',       -- 'Low' | 'Medium' | 'High' | 'Critical'
  status            TEXT        NOT NULL DEFAULT 'pending',      -- 'pending' | 'inprogress' | 'completed' | 'onhold'
  is_fav            BOOLEAN     NOT NULL DEFAULT FALSE,
  notes             TEXT        NOT NULL DEFAULT '',
  key_takeaways     TEXT[]      NOT NULL DEFAULT '{}',
  target_date       DATE,
  status_changed_at TIMESTAMPTZ,
  order_index       INT         NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_custom_topics_cat
  ON public.study_custom_topics (category_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_study_custom_topics_user_status
  ON public.study_custom_topics (user_id, status);

ALTER TABLE public.study_custom_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_custom_topics_all" ON public.study_custom_topics;
CREATE POLICY "study_custom_topics_all" ON public.study_custom_topics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 5. Multi-Format Study Materials (PDFs, Notes, Code, Links, Videos)
CREATE TABLE IF NOT EXISTS public.study_materials (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id        UUID        NOT NULL REFERENCES public.study_custom_topics(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  material_type   TEXT        NOT NULL DEFAULT 'note', -- 'pdf' | 'document' | 'note' | 'link' | 'video' | 'code' | 'cheat_sheet'
  content         TEXT        NOT NULL DEFAULT '',
  file_url        TEXT,
  external_url    TEXT,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  is_bookmarked   BOOLEAN     NOT NULL DEFAULT FALSE,
  file_size_bytes BIGINT      DEFAULT 0,
  duration_mins   INT         DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_materials_topic
  ON public.study_materials (topic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_materials_type
  ON public.study_materials (user_id, material_type);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_materials_all" ON public.study_materials;
CREATE POLICY "study_materials_all" ON public.study_materials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 6. Learning Goals, Targets & Milestones
CREATE TABLE IF NOT EXISTS public.study_learning_goals (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                   TEXT        NOT NULL,
  domain_id               UUID        REFERENCES public.study_custom_domains(id) ON DELETE SET NULL,
  target_date             DATE,
  milestones              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  status                  TEXT        NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'paused'
  target_topics           INT         NOT NULL DEFAULT 10,
  daily_target_minutes    INT         NOT NULL DEFAULT 60,
  weekly_target_topics    INT         NOT NULL DEFAULT 10,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_learning_goals_user
  ON public.study_learning_goals (user_id, status);

ALTER TABLE public.study_learning_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_learning_goals_all" ON public.study_learning_goals;
CREATE POLICY "study_learning_goals_all" ON public.study_learning_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 7. Focus Session & Study Time Logs (Pomodoro / Stopwatch)
CREATE TABLE IF NOT EXISTS public.study_time_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id         UUID        REFERENCES public.study_custom_domains(id) ON DELETE SET NULL,
  topic_id          UUID        REFERENCES public.study_custom_topics(id) ON DELETE SET NULL,
  topic_title       TEXT,
  duration_seconds  INT         NOT NULL DEFAULT 0,
  session_type      TEXT        NOT NULL DEFAULT 'pomodoro', -- 'pomodoro' | 'stopwatch' | 'manual'
  notes             TEXT        NOT NULL DEFAULT '',
  logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_time_logs_user_date
  ON public.study_time_logs (user_id, logged_at DESC);

ALTER TABLE public.study_time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_time_logs_all" ON public.study_time_logs;
CREATE POLICY "study_time_logs_all" ON public.study_time_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 8. User Dashboard Preferences & Resume Learning Marker
CREATE TABLE IF NOT EXISTS public.study_user_preferences (
  user_id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_widgets      TEXT[]      NOT NULL DEFAULT ARRAY['resume','overall','milestones','timer','heatmap','domains','weak_topics','quiz_history'],
  widget_order        JSONB       NOT NULL DEFAULT '["resume","overall","milestones","timer","heatmap","domains","weak_topics","quiz_history"]'::jsonb,
  last_active_topic   JSONB       DEFAULT NULL, -- { domainId, categoryId, topicId, materialId, title, domainTitle, timestamp }
  daily_target_count  INT         NOT NULL DEFAULT 5,
  weekly_goal_count   INT         NOT NULL DEFAULT 20,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.study_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_user_preferences_all" ON public.study_user_preferences;
CREATE POLICY "study_user_preferences_all" ON public.study_user_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
