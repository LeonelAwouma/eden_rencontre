-- ============================================================
--  Eden Connexion — Demandes d'engagement (bouton "S'engager" du chat)
--  Run this migration on your Supabase database
-- ============================================================

CREATE TABLE IF NOT EXISTS public.engagement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id <> recipient_id)
);

ALTER TABLE public.engagement_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS engagement_requests_conv_idx ON public.engagement_requests (conversation_id, created_at DESC);

-- Une seule demande "pending" à la fois par conversation
CREATE UNIQUE INDEX IF NOT EXISTS engagement_requests_pending_unique
  ON public.engagement_requests (conversation_id) WHERE status = 'pending';

-- Accès uniquement via service role (routes API), comme meeting_notifications
DROP POLICY IF EXISTS engagement_requests_service_only ON public.engagement_requests;
CREATE POLICY engagement_requests_service_only ON public.engagement_requests
  FOR ALL USING (false);

-- Élargir le type de notification générique (meeting_notifications sert de
-- table de notifications générique, cf. verification-status-migration.sql)
ALTER TABLE public.meeting_notifications
  DROP CONSTRAINT IF EXISTS meeting_notifications_notification_type_check;

ALTER TABLE public.meeting_notifications
  ADD CONSTRAINT meeting_notifications_notification_type_check
  CHECK (notification_type IN (
    'created', 'updated', 'rescheduled', 'cancelled', 'reminder',
    'meet_invitation', 'event_notification', 'blog_post',
    'verification_pending', 'verification_approved', 'verification_rejected',
    'engagement_request', 'engagement_accepted', 'engagement_declined'
  ));
