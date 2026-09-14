-- ============================================================
--  Garden of Alliance — Matching, Testimonials & Chat Monitoring
--  Run after admin-schema.sql
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- MATCHES — Track matching process between users
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'blocked')),
  match_score NUMERIC(5,2), -- algorithmic compatibility score 0-100
  initiated_by TEXT NOT NULL DEFAULT 'system'
    CHECK (initiated_by IN ('system', 'user_a', 'user_b', 'admin', 'mentor')),
  admin_notes TEXT,
  mentor_id UUID REFERENCES public.profiles(id),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_a_id, user_b_id)
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS matches_status_idx ON public.matches (status);
CREATE INDEX IF NOT EXISTS matches_user_a_idx ON public.matches (user_a_id);
CREATE INDEX IF NOT EXISTS matches_user_b_idx ON public.matches (user_b_id);
CREATE INDEX IF NOT EXISTS matches_created_idx ON public.matches (created_at DESC);

DROP POLICY IF EXISTS matches_service_only ON public.matches;
CREATE POLICY matches_service_only ON public.matches
  FOR ALL USING (false);

-- ══════════════════════════════════════════════════════════════
-- TESTIMONIALS — Member-submitted testimonials (admin-moderated)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  couple_names TEXT, -- e.g. "Jean & Marie"
  title TEXT,
  content TEXT NOT NULL,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'needs_changes')),
  admin_feedback TEXT, -- feedback or rejection reason
  reviewed_by UUID REFERENCES public.admin_users(id),
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  match_id UUID REFERENCES public.matches(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS testimonials_status_idx ON public.testimonials (status);
CREATE INDEX IF NOT EXISTS testimonials_user_idx ON public.testimonials (user_id);
CREATE INDEX IF NOT EXISTS testimonials_featured_idx ON public.testimonials (is_featured) WHERE is_featured = true;

DROP POLICY IF EXISTS testimonials_service_only ON public.testimonials;
CREATE POLICY testimonials_service_only ON public.testimonials
  FOR ALL USING (false);

-- Public read for approved testimonials only
DROP POLICY IF EXISTS testimonials_public_select ON public.testimonials;
CREATE POLICY testimonials_public_select ON public.testimonials
  FOR SELECT USING (status = 'approved');

-- ══════════════════════════════════════════════════════════════
-- CHAT MONITORING — Flag and review conversations
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'restricted', 'blocked')),
  restricted_reason TEXT,
  restricted_by UUID REFERENCES public.admin_users(id),
  restricted_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_a_id, user_b_id)
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS chat_conv_status_idx ON public.chat_conversations (status);
CREATE INDEX IF NOT EXISTS chat_conv_last_msg_idx ON public.chat_conversations (last_message_at DESC);

DROP POLICY IF EXISTS chat_conv_service_only ON public.chat_conversations;
CREATE POLICY chat_conv_service_only ON public.chat_conversations
  FOR ALL USING (false);

-- ══════════════════════════════════════════════════════════════
-- CHAT ALERTS — Security alerts from conversation monitoring
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.chat_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL
    CHECK (alert_type IN ('keyword_trigger', 'report_received', 'spam_detected', 'harassment', 'inappropriate_content', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  snippet TEXT, -- flagged message snippet
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS chat_alerts_status_idx ON public.chat_alerts (status);
CREATE INDEX IF NOT EXISTS chat_alerts_severity_idx ON public.chat_alerts (severity);
CREATE INDEX IF NOT EXISTS chat_alerts_conv_idx ON public.chat_alerts (conversation_id);
CREATE INDEX IF NOT EXISTS chat_alerts_created_idx ON public.chat_alerts (created_at DESC);

DROP POLICY IF EXISTS chat_alerts_service_only ON public.chat_alerts;
CREATE POLICY chat_alerts_service_only ON public.chat_alerts
  FOR ALL USING (false);

-- ══════════════════════════════════════════════════════════════
-- MODERATION ACTIONS — Log of admin moderation activities
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_users(id),
  target_user_id UUID NOT NULL REFERENCES public.profiles(id),
  conversation_id UUID REFERENCES public.chat_conversations(id),
  action_type TEXT NOT NULL
    CHECK (action_type IN ('warning', 'mute', 'restrict', 'temporary_ban', 'permanent_ban', 'message_review', 'account_suspension', 'note')),
  reason TEXT NOT NULL,
  details JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS mod_actions_user_idx ON public.moderation_actions (target_user_id);
CREATE INDEX IF NOT EXISTS mod_actions_admin_idx ON public.moderation_actions (admin_id);
CREATE INDEX IF NOT EXISTS mod_actions_type_idx ON public.moderation_actions (action_type);
CREATE INDEX IF NOT EXISTS mod_actions_created_idx ON public.moderation_actions (created_at DESC);

DROP POLICY IF EXISTS mod_actions_service_only ON public.moderation_actions;
CREATE POLICY mod_actions_service_only ON public.moderation_actions
  FOR ALL USING (false);

-- ══════════════════════════════════════════════════════════════
-- Add subscription/plan column to profiles if not exists
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free'
  CHECK (subscription_plan IN ('free', 'essentiel', 'premium', 'elite'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completion_pct INTEGER DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mentor_assigned UUID REFERENCES public.profiles(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mentor_contacted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_plan_idx ON public.profiles (subscription_plan);