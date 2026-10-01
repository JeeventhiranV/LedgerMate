-- ═══════════════════════════════════════════════════════════════════════════════
-- LedgerMate — Complete Row Level Security (RLS) & Security Hardening
-- Migration: 20261001_security_and_rls_hardening.sql
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Enable Row Level Security on ALL Public Tables
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


-- 2. Hardening User Profile & Ledger Data Isolation

-- Table: public.user_profiles
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


-- Table: public.ledger_data (Core financial database)
ALTER TABLE IF EXISTS public.ledger_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_data_user_isolation" ON public.ledger_data;
CREATE POLICY "ledger_data_user_isolation" ON public.ledger_data
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 3. Hardening Indian Stock Portfolio & Holdings Isolation

-- Table: public.stock_portfolios
ALTER TABLE IF EXISTS public.stock_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_portfolios_user_all" ON public.stock_portfolios;
CREATE POLICY "stock_portfolios_user_all" ON public.stock_portfolios
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- Table: public.stock_holdings
ALTER TABLE IF EXISTS public.stock_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_holdings_user_all" ON public.stock_holdings;
CREATE POLICY "stock_holdings_user_all" ON public.stock_holdings
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- Table: public.stock_transactions
ALTER TABLE IF EXISTS public.stock_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_transactions_user_all" ON public.stock_transactions;
CREATE POLICY "stock_transactions_user_all" ON public.stock_transactions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 4. Hardening Study Hub, Trackers & Quick Links

-- Table: public.lm_config_master
ALTER TABLE IF EXISTS public.lm_config_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lm_config_master_isolation" ON public.lm_config_master;
CREATE POLICY "lm_config_master_isolation" ON public.lm_config_master
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- Table: public.lm_daily_learning
ALTER TABLE IF EXISTS public.lm_daily_learning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lm_daily_learning_isolation" ON public.lm_daily_learning;
CREATE POLICY "lm_daily_learning_isolation" ON public.lm_daily_learning
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- Table: public.lm_coding_tracker
ALTER TABLE IF EXISTS public.lm_coding_tracker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lm_coding_tracker_isolation" ON public.lm_coding_tracker;
CREATE POLICY "lm_coding_tracker_isolation" ON public.lm_coding_tracker
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 5. Revoke Insecure Anonymous Grants on Sensitive Tables
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
