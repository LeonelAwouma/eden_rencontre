-- MÉDIATHÈQUE — Christian Marriage Preparation Media Library

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mediatheque', 'mediatheque', true, 104857600,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/wav','audio/x-m4a','audio/mp4','application/pdf','application/epub+zip'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS mediatheque_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, icon TEXT,
  color TEXT DEFAULT '#486B46', parent_id UUID REFERENCES mediatheque_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mc_slug ON mediatheque_categories(slug);
CREATE INDEX IF NOT EXISTS idx_mc_sort ON mediatheque_categories(sort_order);

CREATE TABLE IF NOT EXISTS mediatheque_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT NOT NULL DEFAULT '',
  content TEXT,
  type TEXT NOT NULL CHECK (type IN ('video','audio','book','pdf','article','testimony','guide','external')),
  category_id UUID REFERENCES mediatheque_categories(id) ON DELETE SET NULL,
  author TEXT, source TEXT, file_url TEXT, external_url TEXT,
  thumbnail_url TEXT, cover_url TEXT, duration TEXT, page_count INTEGER,
  language TEXT DEFAULT 'fr',
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
  target_audience TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  featured BOOLEAN DEFAULT false, recommended BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0, display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  published_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mr_slug ON mediatheque_resources(slug);
CREATE INDEX IF NOT EXISTS idx_mr_type ON mediatheque_resources(type);
CREATE INDEX IF NOT EXISTS idx_mr_category ON mediatheque_resources(category_id);
CREATE INDEX IF NOT EXISTS idx_mr_status ON mediatheque_resources(status);
CREATE INDEX IF NOT EXISTS idx_mr_featured ON mediatheque_resources(featured) WHERE featured = true;

CREATE TABLE IF NOT EXISTS mediatheque_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mediatheque_resource_tags (
  resource_id UUID NOT NULL REFERENCES mediatheque_resources(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES mediatheque_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

CREATE TABLE IF NOT EXISTS mediatheque_learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT NOT NULL DEFAULT '',
  objective TEXT, cover_url TEXT,
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
  estimated_duration TEXT, sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mlp_slug ON mediatheque_learning_paths(slug);

CREATE TABLE IF NOT EXISTS mediatheque_learning_path_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID NOT NULL REFERENCES mediatheque_learning_paths(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES mediatheque_resources(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0, is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(learning_path_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_mlpr_path ON mediatheque_learning_path_resources(learning_path_id);

CREATE TABLE IF NOT EXISTS mediatheque_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, resource_id UUID NOT NULL REFERENCES mediatheque_resources(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'started' CHECK (status IN ('started','in_progress','completed')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_position TEXT, completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_mup_user ON mediatheque_user_progress(user_id);

CREATE TABLE IF NOT EXISTS mediatheque_user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, resource_id UUID NOT NULL REFERENCES mediatheque_resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_muf_user ON mediatheque_user_favorites(user_id);

-- RLS Policies
ALTER TABLE mediatheque_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediatheque_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediatheque_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediatheque_resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediatheque_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediatheque_learning_path_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediatheque_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediatheque_user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active categories" ON mediatheque_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read published resources" ON mediatheque_resources FOR SELECT USING (status = 'published');
CREATE POLICY "Public read tags" ON mediatheque_tags FOR SELECT USING (true);
CREATE POLICY "Public read resource tags" ON mediatheque_resource_tags FOR SELECT USING (true);
CREATE POLICY "Public read published paths" ON mediatheque_learning_paths FOR SELECT USING (status = 'published');
CREATE POLICY "Public read path resources" ON mediatheque_learning_path_resources FOR SELECT USING (true);
CREATE POLICY "Users manage own progress" ON mediatheque_user_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own favorites" ON mediatheque_user_favorites FOR ALL USING (auth.uid() = user_id);

-- Default Categories
INSERT INTO mediatheque_categories (name, slug, description, icon, sort_order) VALUES
  ('Se connaître soi-même', 'se-connaitre', 'Comprendre votre personnalité, vos valeurs et vos attentes', 'User', 1),
  ('Maturité émotionnelle', 'maturite-emotionnelle', 'Développer l''intelligence émotionnelle et la responsabilité', 'Heart', 2),
  ('Foi & Vie spirituelle', 'foi-spirituelle', 'Nourrir votre relation avec Dieu en tant que célibataire', 'BookOpen', 3),
  ('Comprendre le mariage chrétien', 'mariage-chretien', 'La vision biblique de l''alliance et de l''engagement', 'Church', 4),
  ('Choisir son futur conjoint', 'choisir-conjoint', 'Discernement, compatibilité et signaux d''alerte', 'Search', 5),
  ('Bâtir une relation saine', 'relation-saine', 'Communication, respect, confiance et limites', 'Handshake', 6),
  ('Communication & Gestion des conflits', 'communication-conflits', 'Parler, écouter, se réconcilier selon la Bible', 'MessageCircle', 7),
  ('Finances & Responsabilités', 'finances-responsabilites', 'Gestion financière et responsabilités dans le couple', 'Wallet', 8),
  ('Préparation aux fiançailles', 'preparation-fiançailles', 'Préparer votre cœur et votre vie pour les fiançailles', 'Ring', 9),
  ('Préparation au mariage', 'preparation-mariage', 'Tout ce qu''il faut savoir avant de dire « oui »', 'HeartHandshake', 10),
  ('Témoignages de couples', 'temoignages-couples', 'Histoires inspirantes de couples chrétiens', 'Users', 11),
  ('Questions & Réponses', 'questions-reponses', 'Réponses aux questions fréquentes sur le couple et le mariage', 'HelpCircle', 12),
  ('Guides & Exercices', 'guides-exercices', 'Outils pratiques pour votre préparation au mariage', 'FileText', 13),
  ('Livres recommandés', 'livres-recommandes', 'Sélection de livres sur le couple et le mariage chrétien', 'Library', 14)
ON CONFLICT (slug) DO NOTHING;

-- Default Learning Paths
INSERT INTO mediatheque_learning_paths (title, slug, description, objective, level, estimated_duration, sort_order, status) VALUES
  ('Se connaître soi-même', 'se-connaitre', 'Comprendre votre personnalité, vos valeurs et vos objectifs de vie.', 'Aider les célibataires à mieux se comprendre.', 'beginner', '4 semaines', 1, 'published'),
  ('Grandir en maturité', 'grandir-maturite', 'Maturité émotionnelle, responsabilité et conscience de soi.', 'Développer les qualités essentielles.', 'beginner', '5 semaines', 2, 'published'),
  ('Bâtir une relation saine', 'batir-relation-saine', 'Communication, respect, confiance et gestion des conflits.', 'Acquérir les outils relationnels fondamentaux.', 'intermediate', '6 semaines', 3, 'published'),
  ('Comprendre le mariage chrétien', 'comprendre-mariage', 'Vision chrétienne du mariage, engagement et vie spirituelle.', 'Comprendre le sens biblique de l''alliance.', 'intermediate', '5 semaines', 4, 'published'),
  ('Choisir son futur conjoint', 'choisir-futur-conjoint', 'Valeurs, compatibilité, discernement et signaux d''alerte.', 'Apprendre à discerner sagement.', 'intermediate', '4 semaines', 5, 'published'),
  ('Préparation aux fiançailles', 'preparer-fiançailles', 'Se préparer spirituellement et pratiquement.', 'Entrer dans les fiançailles avec sérénité.', 'advanced', '3 semaines', 6, 'published'),
  ('Préparation au mariage', 'preparer-mariage', 'Tout savoir avant de dire « oui ».', 'Être prêt pour un mariage solide.', 'advanced', '6 semaines', 7, 'published')
ON CONFLICT (slug) DO NOTHING;