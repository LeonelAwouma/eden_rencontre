-- ============================================================
--  GARDEN OF ALLIANCE — Blog System Schema
--  Run in Supabase SQL Editor
-- ============================================================

-- ── STORAGE BUCKET ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('blog-images', 'blog-images', true, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ── BLOG CATEGORIES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#486B46',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_sort ON blog_categories(sort_order);

-- ── BLOG TAGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

-- ── BLOG POSTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image_url TEXT,
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  author TEXT NOT NULL DEFAULT 'GARDEN OF ALLIANCE',
  reading_time_minutes INTEGER DEFAULT 5,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured) WHERE featured = true;

-- ── BLOG POST TAGS (junction) ───────────────────────────────
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ── EXTEND MEETING_NOTIFICATIONS FOR BLOG ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_notifications' AND column_name = 'blog_post_id'
  ) THEN
    ALTER TABLE public.meeting_notifications ADD COLUMN blog_post_id UUID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_notifications' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE public.meeting_notifications ADD COLUMN thumbnail_url TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_notifications' AND column_name = 'link'
  ) THEN
    ALTER TABLE public.meeting_notifications ADD COLUMN link TEXT;
  END IF;
END $$;

ALTER TABLE public.meeting_notifications
  DROP CONSTRAINT IF EXISTS meeting_notifications_notification_type_check;
ALTER TABLE public.meeting_notifications
  ADD CONSTRAINT meeting_notifications_notification_type_check
  CHECK (notification_type IN (
    'created','updated','rescheduled','cancelled','reminder',
    'meet_invitation','event_notification','blog_post'
  ));

CREATE INDEX IF NOT EXISTS idx_meeting_notif_blog
  ON public.meeting_notifications (blog_post_id) WHERE blog_post_id IS NOT NULL;

-- ── RLS Policies ────────────────────────────────────────────
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read blog categories" ON blog_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read blog tags" ON blog_tags FOR SELECT USING (true);
CREATE POLICY "Public read published blog posts" ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Public read blog post tags" ON blog_post_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS blog_categories_service_only ON blog_categories;
CREATE POLICY blog_categories_service_only ON blog_categories FOR ALL USING (false);
DROP POLICY IF EXISTS blog_tags_service_only ON blog_tags;
CREATE POLICY blog_tags_service_only ON blog_tags FOR ALL USING (false);
DROP POLICY IF EXISTS blog_posts_service_only ON blog_posts;
CREATE POLICY blog_posts_service_only ON blog_posts FOR ALL USING (false);
DROP POLICY IF EXISTS blog_post_tags_service_only ON blog_post_tags;
CREATE POLICY blog_post_tags_service_only ON blog_post_tags FOR ALL USING (false);

-- ── Default Categories ──────────────────────────────────────
INSERT INTO blog_categories (name, slug, description, color, sort_order) VALUES
  ('Mariage Chrétien', 'mariage-chretien', 'Articles sur le mariage selon la Bible', '#486B46', 1),
  ('Vie de Couple', 'vie-de-couple', 'Conseils pour une relation épanouie', '#6E8B63', 2),
  ('Célibat & Foi', 'celibat-foi', 'Vivre le célibat avec foi et espérance', '#4F7DF3', 3),
  ('Préparation au Mariage', 'preparation-mariage', 'Se préparer pour l''alliance', '#C6A15B', 4),
  ('Témoignages', 'temoignages', 'Histoires inspirantes de couples', '#EC4899', 5),
  ('Spiritualité', 'spiritualite', 'Croissance spirituelle et couple', '#8B5CF6', 6),
  ('Communication', 'communication', 'Dialoguer et s''écouter dans le couple', '#10B981', 7),
  ('Actualités', 'actualités', 'Nouvelles et annonces d''GARDEN OF ALLIANCE', '#F59E0B', 8)
ON CONFLICT (slug) DO NOTHING;
