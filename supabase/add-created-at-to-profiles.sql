-- ============================================================
--  Eden Connexion — Add created_at to profiles
--  Run this migration on your Supabase database
-- ============================================================

-- Add created_at column with default NOW()
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill: set created_at = updated_at for existing rows that have no created_at
UPDATE public.profiles
SET created_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL;

-- Also update the handle_new_user trigger to include created_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, gender, civil_status, region, country, city, profession, bio, marriage_vision, birth_date, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'civilStatus',
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'profession',
    new.raw_user_meta_data->>'bio',
    CASE WHEN new.raw_user_meta_data ? 'marriageVision'
      THEN ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'marriageVision'))
      ELSE NULL END,
    (new.raw_user_meta_data->>'birthDate')::date,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;