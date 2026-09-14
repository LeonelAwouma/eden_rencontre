-- ============================================================
--  Garden of Alliance — Google Meet Integration Schema
--  Run after admin-schema.sql and admin-extensions.sql
-- ============================================================

-- ── MEETINGS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  user_one_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.admin_users(id),
  google_event_id TEXT,
  google_meet_url TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'upcoming', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'expired')),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS meetings_user_one_idx ON public.meetings (user_one_id);
CREATE INDEX IF NOT EXISTS meetings_user_two_idx ON public.meetings (user_two_id);
CREATE INDEX IF NOT EXISTS meetings_status_idx ON public.meetings (status);
CREATE INDEX IF NOT EXISTS meetings_start_time_idx ON public.meetings (start_time DESC);
CREATE INDEX IF NOT EXISTS meetings_admin_idx ON public.meetings (admin_id);

-- RLS: Admin full access via service role
DROP POLICY IF EXISTS meetings_admin_all ON public.meetings;
CREATE POLICY meetings_admin_all ON public.meetings
  FOR ALL USING (false);

-- ── MEETING NOTIFICATIONS TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL
    CHECK (notification_type IN ('created', 'updated', 'rescheduled', 'cancelled', 'reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meeting_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS meeting_notif_user_idx ON public.meeting_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS meeting_notif_meeting_idx ON public.meeting_notifications (meeting_id);

DROP POLICY IF EXISTS meeting_notif_service_only ON public.meeting_notifications;
CREATE POLICY meeting_notif_service_only ON public.meeting_notifications
  FOR ALL USING (false);

-- ── RPC: Get meetings for a specific user (participant) ──────
CREATE OR REPLACE FUNCTION public.get_user_meetings(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  user_one_id UUID,
  user_two_id UUID,
  user_one_name TEXT,
  user_one_avatar TEXT,
  user_two_name TEXT,
  user_two_avatar TEXT,
  google_meet_url TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    m.id,
    m.title,
    m.description,
    m.user_one_id,
    m.user_two_id,
    p1.name AS user_one_name,
    p1.avatar_url AS user_one_avatar,
    p2.name AS user_two_name,
    p2.avatar_url AS user_two_avatar,
    m.google_meet_url,
    m.start_time,
    m.end_time,
    m.duration_minutes,
    m.status,
    m.created_at
  FROM meetings m
  LEFT JOIN profiles p1 ON p1.id = m.user_one_id
  LEFT JOIN profiles p2 ON p2.id = m.user_two_id
  WHERE (m.user_one_id = p_user_id OR m.user_two_id = p_user_id)
    AND m.status NOT IN ('cancelled', 'expired')
  ORDER BY m.start_time ASC;
$$;

-- ── RPC: Get meeting stats for admin dashboard ───────────────
CREATE OR REPLACE FUNCTION public.get_meeting_stats()
RETURNS TABLE (
  total_meetings BIGINT,
  scheduled_meetings BIGINT,
  completed_meetings BIGINT,
  cancelled_meetings BIGINT,
  upcoming_meetings BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COUNT(*) AS total_meetings,
    COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled_meetings,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_meetings,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_meetings,
    COUNT(*) FILTER (WHERE status IN ('scheduled', 'upcoming') AND start_time > now()) AS upcoming_meetings
  FROM meetings;
$$;

-- ── Seed: Add Google OAuth credentials setting ───────────────
INSERT INTO public.platform_settings (category, key, value) VALUES
  ('general', 'google_calendar_credentials', 'null'),
  ('general', 'google_organizer_email', '"leonelawouma65@gmail.com"')
ON CONFLICT (category, key) DO NOTHING;