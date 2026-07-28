-- ============================================================
--  Eden Connexion — Add discovery_source to profiles
--  Run this migration on your Supabase database
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discovery_source TEXT;