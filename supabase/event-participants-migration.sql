-- ── Migration: Add event_participants junction table ────────────────
-- Replaces participant_limit with actual participant selection for events.

CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.meet_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants (event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON public.event_participants (user_id);

-- Service role bypasses RLS; these policies are for direct client access only
DROP POLICY IF EXISTS event_participants_service_all ON public.event_participants;
CREATE POLICY event_participants_service_all ON public.event_participants
  FOR ALL USING (false);