-- ============================================================
--  GARDEN OF ALLIANCE — Add pseudo/first_name/last_name to profiles
--  Run this migration on your Supabase database
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pseudo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
