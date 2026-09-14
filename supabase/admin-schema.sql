-- ============================================================
--  GARDEN OF ALLIANCE — Administration Platform Schema
--  Run after the main schema.sql
-- ============================================================

-- ── ADMIN USERS (separate from auth.users) ───────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ── ADD APPROVAL STATUS TO PROFILES ──────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.admin_users(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Index for fast filtering by status
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);

-- ── MEET EVENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  meeting_link TEXT,
  location TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  participant_limit INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.meet_events ENABLE ROW LEVEL security;
CREATE INDEX IF NOT EXISTS meet_events_date_idx ON public.meet_events (event_date);
CREATE INDEX IF NOT EXISTS meet_events_status_idx ON public.meet_events (status);

-- Public read access for published events
DROP POLICY IF EXISTS meet_events_public_select ON public.meet_events;
CREATE POLICY meet_events_public_select ON public.meet_events
  FOR SELECT USING (status = 'published');

-- ── ADMIN AUDIT LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admin_users(id),
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'event', 'system')),
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS audit_log_admin_idx ON public.admin_audit_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON public.admin_audit_log (target_type, target_id);

-- ── RLS POLICIES FOR ADMIN TABLES ────────────────────────────
-- admin_users: Only accessible via service role (no RLS for client)
DROP POLICY IF EXISTS admin_users_service_only ON public.admin_users;
CREATE POLICY admin_users_service_only ON public.admin_users
  FOR ALL USING (false);

-- audit_log: Only insert via service role, no direct client reads
DROP POLICY IF EXISTS audit_log_service_only ON public.admin_audit_log;
CREATE POLICY audit_log_service_only ON public.admin_audit_log
  FOR ALL USING (false);

-- meet_events: admin write via service role, public read for published
DROP POLICY IF EXISTS meet_events_service_all ON public.meet_events;
CREATE POLICY meet_events_service_all ON public.meet_events
  FOR ALL USING (false);

-- ── HELPER FUNCTION: Check admin exists ──────────────────────
CREATE OR REPLACE FUNCTION public.admin_exists(admin_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = admin_email AND is_active = true
  );
$$;

-- ── HELPER FUNCTION: Get user stats ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  pending_users BIGINT,
  approved_users BIGINT,
  rejected_users BIGINT,
  suspended_users BIGINT,
  total_events BIGINT,
  published_events BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'pending'),
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'approved'),
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'rejected'),
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'suspended'),
    (SELECT COUNT(*) FROM public.meet_events),
    (SELECT COUNT(*) FROM public.meet_events WHERE status = 'published');
$$;

-- ── SEED: First admin account ────────────────────────────────
-- Password: AdminEden2024! (bcrypt hash — change this in production!)
-- The hash below is for 'AdminEden2024!' — replace with your own.
-- INSERT INTO public.admin_users (email, password_hash, name, role)
-- VALUES (
--   'admin@edenconnexion.com',
--   '$2b$10$YourBcryptHashHere',
--   'Super Administrateur',
--   'super_admin'
-- )
-- ON CONFLICT (email) DO NOTHING;