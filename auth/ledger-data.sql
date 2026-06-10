-- ─── LedgerMate Cloud Storage ──────────────────────────────────────────────────
-- Run this in Supabase Dashboard → SQL Editor
-- One row per user; stores the full LedgerMate FinalJson export as JSONB.
-- ────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ledger_data (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Row-level security: each user can only read/write their own row ──────────
ALTER TABLE public.ledger_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_data_user_policy" ON public.ledger_data;
CREATE POLICY "ledger_data_user_policy"
  ON public.ledger_data
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Optional: index updated_at for analytics ────────────────────────────────
CREATE INDEX IF NOT EXISTS ledger_data_updated_idx ON public.ledger_data (updated_at);

-- ── Grant access to authenticated role ──────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_data TO authenticated;
