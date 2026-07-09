-- ============================================================
--  Eden Rencontre — Admin Extensions (Reports, Payments, Settings)
--  Run after admin-schema.sql
-- ============================================================

-- ── USER REPORTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('inappropriate_content', 'harassment', 'fake_profile', 'spam', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.user_reports (status);
CREATE INDEX IF NOT EXISTS reports_created_idx ON public.user_reports (created_at DESC);

DROP POLICY IF EXISTS reports_service_only ON public.user_reports;
CREATE POLICY reports_service_only ON public.user_reports FOR ALL USING (false);

-- ── PAYMENTS / SUBSCRIPTIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year', 'one_time')),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.payment_plans(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);
CREATE INDEX IF NOT EXISTS payments_created_idx ON public.payments (created_at DESC);

DROP POLICY IF EXISTS payments_service_only ON public.payments;
CREATE POLICY payments_service_only ON public.payments FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.payment_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);

DROP POLICY IF EXISTS subscriptions_service_only ON public.subscriptions;
CREATE POLICY subscriptions_service_only ON public.subscriptions FOR ALL USING (false);

-- ── PLATFORM SETTINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('general', 'moderation', 'meets', 'notifications', 'security', 'appearance')),
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_by UUID REFERENCES public.admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, key)
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_service_only ON public.platform_settings;
CREATE POLICY settings_service_only ON public.platform_settings FOR ALL USING (false);

-- Seed default settings
INSERT INTO public.platform_settings (category, key, value) VALUES
  ('general', 'platform_name', '"Eden Rencontre"'),
  ('general', 'contact_email', '"contact@edenrencontre.com"'),
  ('general', 'support_email', '"support@edenrencontre.com"'),
  ('general', 'default_language', '"fr"'),
  ('general', 'timezone', '"Africa/Douala"'),
  ('moderation', 'auto_approve', 'false'),
  ('moderation', 'require_verification', 'true'),
  ('moderation', 'report_threshold', '3'),
  ('moderation', 'suspension_duration_days', '30'),
  ('meets', 'max_participants', '50'),
  ('meets', 'registration_deadline_hours', '24'),
  ('meets', 'default_visibility', '"public"'),
  ('notifications', 'email_enabled', 'true'),
  ('notifications', 'push_enabled', 'false'),
  ('notifications', 'weekly_report', 'true'),
  ('notifications', 'admin_alerts', 'true'),
  ('security', 'two_factor_enabled', 'false'),
  ('security', 'session_timeout_minutes', '60'),
  ('security', 'max_login_attempts', '5'),
  ('security', 'password_min_length', '8'),
  ('appearance', 'theme', '"light"'),
  ('appearance', 'accent_color', '"#486B46"'),
  ('appearance', 'logo_url', 'null'),
  ('appearance', 'banner_text', '"Bienvenue sur Eden Rencontre"')
ON CONFLICT (category, key) DO NOTHING;
