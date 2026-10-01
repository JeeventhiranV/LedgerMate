-- ═══════════════════════════════════════════════════════════════════════════════
-- LedgerMate — Complete Row Level Security (RLS) & Security Hardening
-- Migration: 20261001_security_and_rls_hardening.sql
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Enable Row Level Security on ALL Public Tables ─────────────────────────
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$;


-- ── 2. Helper Functions with Secure Search Path ───────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;


-- ── 3. Hardening User Profile: Prevent Privilege Escalation ───────────────────
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Trigger: Prevent non-admin users from escalating their own role, active status, or module permissions
CREATE OR REPLACE FUNCTION public.protect_user_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Non-admins cannot alter their role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify your own role.';
    END IF;
    -- Non-admins cannot activate themselves
    IF NEW.active IS DISTINCT FROM OLD.active THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify your own active status.';
    END IF;
    -- Non-admins cannot modify allowed_modules
    IF NEW.allowed_modules IS DISTINCT FROM OLD.allowed_modules THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify your own module access permissions.';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_user_profile_privileges ON public.user_profiles;
CREATE TRIGGER tr_protect_user_profile_privileges
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_profile_privileges();


-- ── 4. Hardening Ledger Data & Financial Records Isolation ────────────────────
ALTER TABLE IF EXISTS public.ledger_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_data_user_isolation" ON public.ledger_data;
CREATE POLICY "ledger_data_user_isolation" ON public.ledger_data
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ── 5. Hardening Indian Stock Portfolio & Holdings Isolation ─────────────────
ALTER TABLE IF EXISTS public.stock_portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_portfolios_user_all" ON public.stock_portfolios;
CREATE POLICY "stock_portfolios_user_all" ON public.stock_portfolios
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE IF EXISTS public.stock_holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_holdings_user_all" ON public.stock_holdings;
CREATE POLICY "stock_holdings_user_all" ON public.stock_holdings
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE IF EXISTS public.stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_transactions_user_all" ON public.stock_transactions;
CREATE POLICY "stock_transactions_user_all" ON public.stock_transactions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ── 6. Hardening Study Hub & Config Tables ────────────────────────────────────
ALTER TABLE IF EXISTS public.lm_config_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lm_config_master_isolation" ON public.lm_config_master;
CREATE POLICY "lm_config_master_isolation" ON public.lm_config_master
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE IF EXISTS public.lm_daily_learning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lm_daily_learning_isolation" ON public.lm_daily_learning;
CREATE POLICY "lm_daily_learning_isolation" ON public.lm_daily_learning
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE IF EXISTS public.lm_coding_tracker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lm_coding_tracker_isolation" ON public.lm_coding_tracker;
CREATE POLICY "lm_coding_tracker_isolation" ON public.lm_coding_tracker
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ── 7. Hardening Community Hub Chat Deletions ─────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_messages') THEN
    DROP POLICY IF EXISTS "allow_delete_room_messages" ON public.community_messages;
    DROP POLICY IF EXISTS "community_messages_delete" ON public.community_messages;
    CREATE POLICY "community_messages_delete" ON public.community_messages
      FOR DELETE TO authenticated
      USING (auth.uid() = author_id OR public.is_admin());
  END IF;
END $$;


-- ── 8. Revoke Insecure Anonymous Grants on Sensitive Financial Tables ────────
REVOKE ALL ON public.ledger_data FROM anon;
REVOKE ALL ON public.stock_portfolios FROM anon;
REVOKE ALL ON public.stock_holdings FROM anon;
REVOKE ALL ON public.stock_transactions FROM anon;

-- Ensure authenticated users have standard CRUD permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_portfolios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_holdings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
