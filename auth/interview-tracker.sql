-- ══════════════════════════════════════════════════════════════════════════════
--  Interview Tracker — Supabase SQL Schema
--  LedgerMate · Study Module
--  Run once in the Supabase SQL editor.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. interview_applications ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_applications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  company     TEXT        NOT NULL,
  role        TEXT        NOT NULL,
  location    TEXT,
  url         TEXT,
  source      TEXT,

  applied_on  DATE        DEFAULT CURRENT_DATE,

  status      TEXT        NOT NULL DEFAULT 'applied'
    CHECK (status IN (
      'wishlist','applied','screening',
      'round1','round2','round3',
      'hr','offer','accepted','rejected','withdrawn'
    )),

  priority    INTEGER     NOT NULL DEFAULT 0
    CHECK (priority BETWEEN 0 AND 2),

  exp_ctc     TEXT,
  offered_ctc TEXT,
  notes       TEXT,
  tags        TEXT[]      NOT NULL DEFAULT '{}',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. interview_rounds ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_rounds (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id       UUID        NOT NULL
    REFERENCES public.interview_applications(id) ON DELETE CASCADE,

  round_num    INTEGER     NOT NULL DEFAULT 1,

  round_type   TEXT        NOT NULL DEFAULT 'technical'
    CHECK (round_type IN (
      'screening','technical','system_design',
      'hr','assignment','offer_discussion','other'
    )),

  sched_date   DATE,
  sched_time   TIME,
  platform     TEXT,
  interviewer  TEXT,
  duration     INTEGER,   -- minutes

  status       TEXT        NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','completed','cancelled','rescheduled')),

  outcome      TEXT,       -- e.g. "Passed", "Failed", "Pending"
  feedback     TEXT,
  questions    TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.interview_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_rounds       ENABLE ROW LEVEL SECURITY;

-- Applications: users see only their own rows
CREATE POLICY "Users manage own applications"
  ON public.interview_applications
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Rounds: users see rounds that belong to their own applications
CREATE POLICY "Users manage own rounds"
  ON public.interview_rounds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_applications a
      WHERE a.id = app_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.interview_applications a
      WHERE a.id = app_id
        AND a.user_id = auth.uid()
    )
  );

-- ── 4. updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON public.interview_applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.interview_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. Performance Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ia_user_id
  ON public.interview_applications (user_id);

CREATE INDEX IF NOT EXISTS idx_ia_user_status
  ON public.interview_applications (user_id, status);

CREATE INDEX IF NOT EXISTS idx_ia_user_applied_on
  ON public.interview_applications (user_id, applied_on DESC);

CREATE INDEX IF NOT EXISTS idx_ir_app_id
  ON public.interview_rounds (app_id);

CREATE INDEX IF NOT EXISTS idx_ir_sched_date
  ON public.interview_rounds (sched_date);

-- ── 6. Grant access to authenticated role ────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.interview_applications TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.interview_rounds TO authenticated;
