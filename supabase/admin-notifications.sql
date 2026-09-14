-- ============================================================
--  Garden of Alliance — Admin Notifications
--  Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'event'
    CHECK (type IN ('event', 'user', 'testimonial', 'meeting', 'report', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- optional link to navigate to (e.g. /admin/events/123)
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB, -- extra data like event_id, user_id, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_notifications_read_idx ON public.admin_notifications (is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS admin_notifications_created_idx ON public.admin_notifications (created_at DESC);

-- Allow service role full access
DROP POLICY IF EXISTS admin_notifications_service_only ON public.admin_notifications;
CREATE POLICY admin_notifications_service_only ON public.admin_notifications
  FOR ALL USING (false);