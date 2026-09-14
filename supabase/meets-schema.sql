-- ============================================================
--  GARDEN OF ALLIANCE — Google Meet Spaces Schema
--  For admin-created Google Meet meetings with email invitations
--  Run after meetings-schema.sql
-- ============================================================

-- ── MEETS TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  meeting_uri TEXT,
  meeting_code TEXT,
  space_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,  -- duration in minutes
  created_by UUID,  -- admin user id (null for env-admin)
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'completed')),
  CONSTRAINT meets_title_not_empty CHECK (length(trim(title)) > 0)
);

ALTER TABLE public.meets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS meets_created_by_idx ON public.meets (created_by);
CREATE INDEX IF NOT EXISTS meets_status_idx ON public.meets (status);
CREATE INDEX IF NOT EXISTS meets_start_time_idx ON public.meets (start_time DESC);

-- RLS: Only service role can access (admin auth handled server-side)
DROP POLICY IF EXISTS meets_service_only ON public.meets;
CREATE POLICY meets_service_only ON public.meets
  FOR ALL USING (false);

-- ── MEET INVITATIONS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meet_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID NOT NULL REFERENCES public.meets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  email_sent_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE (meet_id, user_id)
);

ALTER TABLE public.meet_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS meet_inv_meet_id_idx ON public.meet_invitations (meet_id);
CREATE INDEX IF NOT EXISTS meet_inv_user_id_idx ON public.meet_invitations (user_id);
CREATE INDEX IF NOT EXISTS meet_inv_status_idx ON public.meet_invitations (status);

-- RLS: Only service role can access (admin auth handled server-side)
DROP POLICY IF EXISTS meet_inv_service_only ON public.meet_invitations;
CREATE POLICY meet_inv_service_only ON public.meet_invitations
  FOR ALL USING (false);

-- ── RPC: Get meet stats for admin dashboard ───────────────────
CREATE OR REPLACE FUNCTION public.get_meet_space_stats()
RETURNS TABLE (
  total_meets BIGINT,
  active_meets BIGINT,
  cancelled_meets BIGINT,
  completed_meets BIGINT,
  total_invitations BIGINT,
  sent_invitations BIGINT,
  pending_invitations BIGINT,
  failed_invitations BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM meets) AS total_meets,
    (SELECT COUNT(*) FROM meets WHERE status = 'active') AS active_meets,
    (SELECT COUNT(*) FROM meets WHERE status = 'cancelled') AS cancelled_meets,
    (SELECT COUNT(*) FROM meets WHERE status = 'completed') AS completed_meets,
    (SELECT COUNT(*) FROM meet_invitations) AS total_invitations,
    (SELECT COUNT(*) FROM meet_invitations WHERE status = 'sent') AS sent_invitations,
    (SELECT COUNT(*) FROM meet_invitations WHERE status = 'pending') AS pending_invitations,
    (SELECT COUNT(*) FROM meet_invitations WHERE status = 'failed') AS failed_invitations;
$$;