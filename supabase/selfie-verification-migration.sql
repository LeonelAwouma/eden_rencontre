-- ============================================================
--  Selfie Verification: Add selfie verification columns to profiles
--  Run after schema.sql
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selfie_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selfie_verification_score INTEGER DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selfie_url TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photos TEXT[];

COMMENT ON COLUMN public.profiles.selfie_verified IS 'Whether the user passed selfie verification during registration';
COMMENT ON COLUMN public.profiles.selfie_verification_score IS 'Selfie verification match score (0-100)';
COMMENT ON COLUMN public.profiles.selfie_url IS 'URL of the selfie taken for verification';
COMMENT ON COLUMN public.profiles.profile_photos IS 'Array of profile photo URLs uploaded during registration';
