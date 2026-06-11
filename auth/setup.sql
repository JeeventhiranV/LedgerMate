  -- ═══════════════════════════════════════════════════════════════════════════
  --  LedgerMate — Supabase Setup SQL
  --  Run this in: Supabase Dashboard → SQL Editor → Run All
  -- ═══════════════════════════════════════════════════════════════════════════


  -- ─── 1. user_profiles ───────────────────────────────────────────────────────
  --  One row per auth.users entry.
  --  First user to sign up is auto-promoted to admin and activated.
  --  All subsequent signups are active=false (pending admin approval).

  CREATE TABLE IF NOT EXISTS public.user_profiles (
    id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email            text        NOT NULL,
    display_name     text,
    role             text        NOT NULL DEFAULT 'user',     -- 'user' | 'admin'
    active           boolean     NOT NULL DEFAULT false,      -- admin must approve
    allowed_modules  jsonb       NOT NULL DEFAULT '[]'::jsonb, -- [] = all modules
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS user_profiles_role_idx   ON public.user_profiles (role);
  CREATE INDEX IF NOT EXISTS user_profiles_active_idx ON public.user_profiles (active);


  -- ─── 2. Helper: is_admin() ─────────────────────────────────────────────────
  --  SECURITY DEFINER so it bypasses RLS when called inside policies.
  --  Returns true if the calling user has role='admin' AND active=true.

  CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND active = true
    )
  $$ LANGUAGE sql SECURITY DEFINER STABLE;


  -- ─── 3. Row-Level Security for user_profiles ────────────────────────────────

  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

  -- Drop any stale policies before recreating
  DROP POLICY IF EXISTS "user_own_profile_select"   ON public.user_profiles;
  DROP POLICY IF EXISTS "admin_all_select"          ON public.user_profiles;
  DROP POLICY IF EXISTS "admin_all_insert"          ON public.user_profiles;
  DROP POLICY IF EXISTS "admin_all_update"          ON public.user_profiles;
  DROP POLICY IF EXISTS "admin_all_delete"          ON public.user_profiles;
  DROP POLICY IF EXISTS "users_can_read_own"        ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;

  -- Every authenticated user can read their own profile
  CREATE POLICY "user_own_profile_select"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

  -- Admins can read all profiles
  CREATE POLICY "admin_all_select"
    ON public.user_profiles FOR SELECT
    USING (public.is_admin());

  -- Admins can insert new profiles (for users they create)
  CREATE POLICY "admin_all_insert"
    ON public.user_profiles FOR INSERT
    WITH CHECK (public.is_admin() OR auth.uid() = id);

  -- Admins can update any profile (approve, role change, module access)
  CREATE POLICY "admin_all_update"
    ON public.user_profiles FOR UPDATE
    USING (public.is_admin() OR auth.uid() = id)
    WITH CHECK (public.is_admin() OR auth.uid() = id);

  -- Admins can deactivate / remove profiles
  CREATE POLICY "admin_all_delete"
    ON public.user_profiles FOR DELETE
    USING (public.is_admin());


  -- ─── 4. Trigger: auto-create profile on signup ──────────────────────────────
  --  First user → admin + active=true  (bootstraps the system)
  --  All others → user + active=false  (pending approval)

  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    existing_count integer;
  BEGIN
    SELECT COUNT(*) INTO existing_count FROM public.user_profiles;

    INSERT INTO public.user_profiles (id, email, display_name, role, active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      CASE WHEN existing_count = 0 THEN 'admin' ELSE 'user' END,
      CASE WHEN existing_count = 0 THEN true    ELSE false  END
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  -- ─── 5. access_requests (optional self-registration flow) ───────────────────

  CREATE TABLE IF NOT EXISTS public.access_requests (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL,
    email       text        NOT NULL,
    message     text,
    status      text        NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    created_at  timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz
  );

  CREATE UNIQUE INDEX IF NOT EXISTS access_requests_email_idx
    ON public.access_requests (lower(email));
  CREATE INDEX IF NOT EXISTS access_requests_status_idx
    ON public.access_requests (status);

  ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Public can submit access requests"   ON public.access_requests;
  DROP POLICY IF EXISTS "Users can view own access request"   ON public.access_requests;
  DROP POLICY IF EXISTS "admin_read_all_requests"             ON public.access_requests;
  DROP POLICY IF EXISTS "admin_update_requests"               ON public.access_requests;

  -- Anyone can submit a request
  CREATE POLICY "Public can submit access requests"
    ON public.access_requests FOR INSERT WITH CHECK (true);

  -- Authenticated users read their own request
  CREATE POLICY "Users can view own access request"
    ON public.access_requests FOR SELECT
    USING (auth.role() = 'authenticated' AND lower(auth.jwt() ->> 'email') = lower(email));

  -- Admins read + update all requests
  CREATE POLICY "admin_read_all_requests"
    ON public.access_requests FOR SELECT
    USING (public.is_admin());

  CREATE POLICY "admin_update_requests"
    ON public.access_requests FOR UPDATE
    USING (public.is_admin());


  -- ─── 6. Grants ──────────────────────────────────────────────────────────────

  GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles  TO authenticated;
  GRANT SELECT, INSERT, UPDATE         ON public.access_requests TO authenticated, anon;


  -- ═══════════════════════════════════════════════════════════════════════════
  --  FIRST-RUN NOTES
  --  1. Run this entire script in SQL Editor.
  --  2. The first account to sign up becomes admin automatically.
  --  3. All subsequent accounts are pending until approved in Admin Panel.
  --  4. In Auth → Settings: optionally disable public signups for invite-only.
  -- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  -- Explicitly delete cloud sync data (also cascades, but being explicit)
  DELETE FROM public.ledger_data   WHERE ledger_data.user_id   = delete_user.user_id;
  DELETE FROM public.user_profiles WHERE user_profiles.id      = delete_user.user_id;

  -- Delete auth user (cascades any remaining FK references)
  DELETE FROM auth.users WHERE id = delete_user.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;



-- Backfill missing user_profiles for any auth.users with no profile
INSERT INTO public.user_profiles (id, email, display_name, role, active)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'user',
  false   -- pending admin approval
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL;



-- Recreate the trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing_count integer;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM public.user_profiles;
  INSERT INTO public.user_profiles (id, email, display_name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,''), '@', 1)),
    CASE WHEN existing_count = 0 THEN 'admin' ELSE 'user' END,
    CASE WHEN existing_count = 0 THEN true    ELSE false  END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
