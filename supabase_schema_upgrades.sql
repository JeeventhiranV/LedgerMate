-- ==============================================================================
-- LedgerMate & Study Hub – Supabase Schema Upgrades & Optimization Migration
-- ──────────────────────────────────────────────────────────────────────────────
-- Free Tier Optimization: Row-Level Security, Storage Buckets, and Auto-Purge
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 2. Receipts & Bill Attachments Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receipts_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id TEXT,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INT NOT NULL,
    mime_type TEXT DEFAULT 'image/webp',
    merchant TEXT,
    amount NUMERIC(12, 2),
    receipt_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Receipts Vault
ALTER TABLE public.receipts_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own receipts"
    ON public.receipts_vault
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_receipts_user_tx ON public.receipts_vault(user_id, transaction_id);

-- ─── 3. Shared Bill Splitting & Group Settlements ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.shared_bill_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    description TEXT,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    split_type TEXT DEFAULT 'equal', -- equal, exact, percentage
    members JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{id, name, upi, paid, share}]
    settlements JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{from, to, amount, settled}]
    status TEXT DEFAULT 'active', -- active, settled, archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Bill Splits
ALTER TABLE public.shared_bill_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and edit bill splits they are involved with"
    ON public.shared_bill_splits
    FOR ALL
    TO authenticated
    USING (auth.uid() = created_by OR members @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text)))
    WITH CHECK (auth.uid() = created_by);

-- ─── 4. Spaced Repetition (SRS) Flashcards Sync ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module TEXT NOT NULL, -- java, dsa, react, systemdesign, hr
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    ef NUMERIC(4, 2) DEFAULT 2.50,
    repetition INT DEFAULT 0,
    interval_days INT DEFAULT 0,
    due_date DATE DEFAULT CURRENT_DATE,
    last_reviewed TIMESTAMPTZ,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.study_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their study flashcards"
    ON public.study_flashcards
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_flashcards_due ON public.study_flashcards(user_id, due_date);

-- ─── 5. Synchronized Live Study Rooms & Presence ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_live_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_slug TEXT UNIQUE NOT NULL,
    room_name TEXT NOT NULL,
    topic TEXT NOT NULL,
    active_users_count INT DEFAULT 0,
    pomodoro_status JSONB DEFAULT '{"state":"idle","timeRemaining":1500,"cycle":1}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.study_live_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view and join study rooms"
    ON public.study_live_rooms
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ─── 6. Automated Cleanup Routine (Free Tier Maintenance) ─────────────────────
-- Function to clean up stale ephemeral chat messages & inactive rooms (> 30 days old)
CREATE OR REPLACE FUNCTION public.clean_stale_ephemeral_data()
RETURNS VOID AS $$
BEGIN
    -- Delete community messages older than 45 days in temporary channels
    DELETE FROM public.community_messages
    WHERE created_at < NOW() - INTERVAL '45 days'
      AND room_id IN (SELECT id FROM public.community_chat_rooms WHERE slug LIKE 'temp-%');

    -- Reset empty inactive study rooms
    UPDATE public.study_live_rooms
    SET active_users_count = 0,
        pomodoro_status = '{"state":"idle","timeRemaining":1500,"cycle":1}'::jsonb
    WHERE updated_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. Storage Bucket Configuration Instructions ────────────────────────────
-- 1. Create a public/authenticated bucket named 'receipts_vault' in Supabase Storage.
-- 2. Storage RLS Policy (SQL or Dashboard):
--    Allow authenticated users to upload to their own folder: (bucket_id = 'receipts_vault' AND (storage.foldername(name))[1] = auth.uid()::text)
-- ==============================================================================
