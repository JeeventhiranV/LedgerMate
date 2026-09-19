-- =============================================================================
-- Migration: 20260624_indian_stocks_portfolio.sql
-- Description: Core schema, indexes, and RLS policies for Indian Stock Portfolio:
--   1. stock_portfolios: User portfolios (Default portfolio, Trading, Long-term, etc.)
--   2. stock_holdings: Stock holdings per portfolio (Symbol, Company, Exchange, Sector)
--   3. stock_transactions: Individual BUY / SELL order executions with charges
--   4. stock_price_cache: Shared/cached market price quotes
-- =============================================================================

-- 1. Portfolios Table
CREATE TABLE IF NOT EXISTS public.stock_portfolios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'Main Portfolio',
  currency    TEXT        NOT NULL DEFAULT 'INR',
  is_default  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_portfolios_user ON public.stock_portfolios (user_id);

ALTER TABLE public.stock_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_portfolios_user_select" ON public.stock_portfolios;
CREATE POLICY "stock_portfolios_user_select" ON public.stock_portfolios FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_portfolios_user_insert" ON public.stock_portfolios;
CREATE POLICY "stock_portfolios_user_insert" ON public.stock_portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_portfolios_user_update" ON public.stock_portfolios;
CREATE POLICY "stock_portfolios_user_update" ON public.stock_portfolios FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_portfolios_user_delete" ON public.stock_portfolios;
CREATE POLICY "stock_portfolios_user_delete" ON public.stock_portfolios FOR DELETE USING (auth.uid() = user_id);


-- 2. Stock Holdings Table
CREATE TABLE IF NOT EXISTS public.stock_holdings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id  UUID        NOT NULL REFERENCES public.stock_portfolios(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol        TEXT        NOT NULL,         -- e.g. 'RELIANCE', 'TCS', 'HDFCBANK'
  company_name  TEXT        NOT NULL,         -- e.g. 'Reliance Industries Ltd'
  exchange      TEXT        NOT NULL DEFAULT 'NSE', -- 'NSE' or 'BSE'
  sector        TEXT        DEFAULT 'General',      -- e.g. 'IT', 'Banking', 'Energy'
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (portfolio_id, symbol, exchange)
);

CREATE INDEX IF NOT EXISTS idx_stock_holdings_user ON public.stock_holdings (user_id, portfolio_id);
CREATE INDEX IF NOT EXISTS idx_stock_holdings_symbol ON public.stock_holdings (symbol, exchange);

ALTER TABLE public.stock_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_holdings_user_select" ON public.stock_holdings;
CREATE POLICY "stock_holdings_user_select" ON public.stock_holdings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_holdings_user_insert" ON public.stock_holdings;
CREATE POLICY "stock_holdings_user_insert" ON public.stock_holdings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_holdings_user_update" ON public.stock_holdings;
CREATE POLICY "stock_holdings_user_update" ON public.stock_holdings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_holdings_user_delete" ON public.stock_holdings;
CREATE POLICY "stock_holdings_user_delete" ON public.stock_holdings FOR DELETE USING (auth.uid() = user_id);


-- 3. Stock Transactions Table (BUY / SELL Order Records)
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id        UUID          NOT NULL REFERENCES public.stock_holdings(id) ON DELETE CASCADE,
  portfolio_id      UUID          NOT NULL REFERENCES public.stock_portfolios(id) ON DELETE CASCADE,
  user_id           UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type  TEXT          NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
  quantity          NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  price             NUMERIC(14,2) NOT NULL CHECK (price > 0),
  brokerage         NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (brokerage >= 0),
  taxes             NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (taxes >= 0),
  transaction_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_user_holding ON public.stock_transactions (user_id, holding_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON public.stock_transactions (user_id, transaction_date DESC);

ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_transactions_user_select" ON public.stock_transactions;
CREATE POLICY "stock_transactions_user_select" ON public.stock_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_transactions_user_insert" ON public.stock_transactions;
CREATE POLICY "stock_transactions_user_insert" ON public.stock_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_transactions_user_update" ON public.stock_transactions;
CREATE POLICY "stock_transactions_user_update" ON public.stock_transactions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_transactions_user_delete" ON public.stock_transactions;
CREATE POLICY "stock_transactions_user_delete" ON public.stock_transactions FOR DELETE USING (auth.uid() = user_id);


-- 4. Shared Market Price Cache Table (Public read for authenticated users)
CREATE TABLE IF NOT EXISTS public.stock_price_cache (
  symbol            TEXT          NOT NULL,
  exchange          TEXT          NOT NULL DEFAULT 'NSE',
  price             NUMERIC(14,2) NOT NULL,
  previous_close    NUMERIC(14,2),
  change            NUMERIC(14,2),
  change_percent    NUMERIC(8,4),
  market_status     TEXT          DEFAULT 'OPEN',
  market_timestamp  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, exchange)
);

ALTER TABLE public.stock_price_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_price_cache_select" ON public.stock_price_cache;
CREATE POLICY "stock_price_cache_select" ON public.stock_price_cache FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stock_price_cache_write" ON public.stock_price_cache;
CREATE POLICY "stock_price_cache_write" ON public.stock_price_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_portfolios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_holdings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_price_cache TO authenticated;
