-- ============================================================
--  Eden Connexion — Testimonials Table Setup
--  Run this in Supabase SQL Editor to create/update the table
-- ============================================================

-- Create testimonials table if not exists
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  couple_names TEXT,
  title TEXT,
  content TEXT NOT NULL,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'needs_changes')),
  admin_feedback TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  match_id UUID,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add image_url column if table already exists but column is missing
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS testimonials_status_idx ON public.testimonials (status);
CREATE INDEX IF NOT EXISTS testimonials_user_idx ON public.testimonials (user_id);
CREATE INDEX IF NOT EXISTS testimonials_featured_idx ON public.testimonials (is_featured) WHERE is_featured = true;

-- RLS policies
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they exist
DROP POLICY IF EXISTS testimonials_service_only ON public.testimonials;
CREATE POLICY testimonials_service_only ON public.testimonials
  FOR ALL USING (false);

DROP POLICY IF EXISTS testimonials_public_select ON public.testimonials;
CREATE POLICY testimonials_public_select ON public.testimonials
  FOR SELECT USING (status = 'approved');

-- Create storage bucket for testimonial images (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('testimonials', 'testimonials', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy for testimonials bucket
-- CREATE POLICY "Allow authenticated uploads to testimonials"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'testimonials');

-- CREATE POLICY "Public read access to testimonials images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'testimonials');