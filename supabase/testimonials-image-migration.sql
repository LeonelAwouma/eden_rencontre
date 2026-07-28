-- ============================================================
--  Testimonials: Add image_url column for uploaded photos
--  Run after matching-testimonials-chat-schema.sql
-- ============================================================

ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for testimonial images (run in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('testimonials', 'testimonials', true)
--   ON CONFLICT (id) DO NOTHING;

-- Storage policy for authenticated uploads
-- CREATE POLICY "Authenticated users can upload testimonial images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'testimonials' AND auth.role() = 'authenticated');

-- Storage policy for public reads
-- CREATE POLICY "Anyone can view testimonial images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'testimonials');