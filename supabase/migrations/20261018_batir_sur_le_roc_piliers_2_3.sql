-- ============================================================
--  Formation « Bâtir sur le roc » — Piliers 2 et 3 dans la médiathèque
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être rejoué sans créer de doublons.
--
--  Même principe que 20260922_batir_sur_le_roc_pilier1.sql : chaque leçon est
--  référencée comme ressource (type « Guide ») et chaque pilier devient un parcours.
--  Généré depuis src/lib/formation/pilier-2.ts et pilier-3.ts : titres, durées,
--  vignettes et PDF identiques à l'Académie. Chaque parcours a pour image
--  l'affiche de son pilier (le pilier 1 garde la couverture de la formation).
-- ============================================================

-- ───────────── Pilier 2 — Connaissance de soi, tempéraments & guérison intérieure ─────────────

INSERT INTO mediatheque_learning_paths (title, slug, description, objective, cover_url, level, estimated_duration, sort_order, status, published_at)
VALUES (
  'Bâtir sur le roc · Pilier 2 — Connaissance de soi, tempéraments & guérison intérieure',
  'batir-sur-le-roc-pilier-2',
  'Se connaître en vérité — tempérament, style d''attachement, blessures et schémas hérités — pour clarifier ses besoins et ses valeurs, pardonner, briser les liens du passé et entrer libre dans l''alliance.',
  'Se connaître, guérir et entrer libre dans l''alliance.',
  '/formation/batir-sur-le-roc/images/pilier-2.webp',
  'beginner', 'environ 1 h', 1, 'published', now()
)
ON CONFLICT (slug) DO NOTHING;

-- Parcours déjà créé sans image (première version de ce fichier) : affiche du pilier.
UPDATE mediatheque_learning_paths
SET cover_url = '/formation/batir-sur-le-roc/images/pilier-2.webp', updated_at = now()
WHERE slug = 'batir-sur-le-roc-pilier-2'
  AND (cover_url IS NULL OR cover_url = '' OR cover_url IN ('/formation/batir-sur-le-roc/images/couverture.webp', '/batir_roc.png', '/batir_roc.webp'));

WITH lessons(n, slug, title, description, minutes, page, pdf, thumb, cover) AS (
  VALUES
    (1, 'batir-sur-le-roc-2-1-se-connaitre-pour-mieux-aimer', 'Leçon 2.1 — Se connaître pour mieux aimer',
        'Tempérament, style d''attachement et grâce : se connaître en vérité pour mieux aimer.', '9 min',
        '/dashboard/academie/batir-sur-le-roc/2-1', '/formation/batir-sur-le-roc/pdf/lecon-2-1-se-connaitre-pour-mieux-aimer.pdf', '/formation/batir-sur-le-roc/images/lecon-2-1-carte.webp', '/formation/batir-sur-le-roc/images/lecon-2-1.webp'),
    (2, 'batir-sur-le-roc-2-2-identifier-et-guerir-ses-blessures', 'Leçon 2.2 — Identifier et guérir ses blessures',
        'T''aider à identifier avec précision tes blessures et tes rejets du passé, à comprendre comment ils agissent dans tes relations, et à emprunter le chemin concret de la guérison — non pas seul(e), mais accompagné(e).', '12 min',
        '/dashboard/academie/batir-sur-le-roc/2-2', '/formation/batir-sur-le-roc/pdf/lecon-2-2-identifier-et-guerir-ses-blessures.pdf', '/formation/batir-sur-le-roc/images/lecon-2-2-carte.webp', '/formation/batir-sur-le-roc/images/pilier-2.webp'),
    (3, 'batir-sur-le-roc-2-3-la-rupture-avec-les-schemas-toxiques', 'Leçon 2.3 — La rupture avec les schémas relationnels toxiques et familiaux',
        'Te donner les outils psychologiques et spirituels pour identifier tes fidélités familiales invisibles, démasquer tes pièges relationnels répétitifs, briser le cycle des schémas toxiques, et établir une indépendance affective et spirituelle saine avant de t''engager dans le mariage.', '10 min',
        '/dashboard/academie/batir-sur-le-roc/2-3', '/formation/batir-sur-le-roc/pdf/lecon-2-3-la-rupture-avec-les-schemas-toxiques.pdf', '/formation/batir-sur-le-roc/images/lecon-2-3-carte.webp', '/formation/batir-sur-le-roc/images/lecon-2-3.webp'),
    (4, 'batir-sur-le-roc-2-4-clarifier-ses-attentes-valeurs-et-besoins', 'Leçon 2.4 — Clarifier ses attentes, ses valeurs non négociables et ses besoins affectifs',
        'Te guider pas à pas dans la clarification de tes besoins affectifs essentiels, l''établissement rigoureux de tes valeurs non négociables, et la déconstruction des attentes fantasmées afin d''aborder la recherche de conjoint avec un discernement aiguisé.', '8 min',
        '/dashboard/academie/batir-sur-le-roc/2-4', '/formation/batir-sur-le-roc/pdf/lecon-2-4-clarifier-ses-attentes-valeurs-et-besoins.pdf', '/formation/batir-sur-le-roc/images/lecon-2-4-carte.webp', '/formation/batir-sur-le-roc/images/pilier-2.webp'),
    (5, 'batir-sur-le-roc-2-5-estime-de-soi-et-celibat-epanoui', 'Leçon 2.5 — L''estime de soi, l''autonomie affective et le célibat épanoui',
        'Te libérer de la dépendance affective, fortifier ton estime de toi en Christ, et développer une véritable autonomie affective afin de vivre un célibat épanoui, confiant et attractif avant de t''engager dans le mariage.', '8 min',
        '/dashboard/academie/batir-sur-le-roc/2-5', '/formation/batir-sur-le-roc/pdf/lecon-2-5-estime-de-soi-et-celibat-epanoui.pdf', '/formation/batir-sur-le-roc/images/lecon-2-5-carte.webp', '/formation/batir-sur-le-roc/images/lecon-2-5.webp'),
    (6, 'batir-sur-le-roc-2-6-le-pardon-et-la-reconciliation', 'Leçon 2.6 — La gestion du pardon et la réconciliation avec son histoire',
        'Te donner les clés théologiques, psychologiques et pratiques pour pardonner à ceux qui t''ont blessé(e), te réconcilier avec ta propre histoire (tes choix passés, tes échecs et ton temps perçu comme « perdu »), et fermer définitivement la porte de l''amertume afin d''entrer libre et léger(e) dans le pilier 3.', '9 min',
        '/dashboard/academie/batir-sur-le-roc/2-6', '/formation/batir-sur-le-roc/pdf/lecon-2-6-le-pardon-et-la-reconciliation.pdf', '/formation/batir-sur-le-roc/images/lecon-2-6-carte.webp', '/formation/batir-sur-le-roc/images/lecon-2-6.webp'),
    (7, 'batir-sur-le-roc-2-7-brisement-de-liens-spirituels', 'Leçon 2.7 — Brisement de liens spirituels : sorcellerie, malédictions et alliances générationnelles',
        'Te donner le discernement biblique pour identifier d''éventuelles portes spirituelles ouvertes (pratiques occultes ancestrales, paroles de malédiction, alliances générationnelles, sorcellerie), et t''armer de l''autorité du nom de Jésus et du sang de l''Alliance pour proclamer ta libération définitive et entrer sereinement dans le projet du mariage.', '8 min',
        '/dashboard/academie/batir-sur-le-roc/2-7', '/formation/batir-sur-le-roc/pdf/lecon-2-7-brisement-de-liens-spirituels.pdf', '/formation/batir-sur-le-roc/images/lecon-2-7-carte.webp', '/formation/batir-sur-le-roc/images/lecon-2-7.webp')
)
INSERT INTO mediatheque_resources (
  title, slug, description, type, category_id, author, source, external_url, file_url,
  thumbnail_url, cover_url, duration, language, level, target_audience, status, featured, recommended,
  display_order, published_at
)
SELECT
  l.title, l.slug, l.description, 'guide',
  (SELECT id FROM mediatheque_categories WHERE slug = 'preparation-mariage'),
  'Garden of Alliance', 'Formation « Bâtir sur le roc »',
  l.page, l.pdf, l.thumb, l.cover,
  l.minutes, 'fr', 'beginner', 'Célibataires', 'published', false, true,
  l.n, now()
FROM lessons l
ON CONFLICT (slug) DO NOTHING;

-- Étapes du parcours, dans l'ordre des leçons.
INSERT INTO mediatheque_learning_path_resources (learning_path_id, resource_id, sort_order, is_required)
SELECT p.id, r.id, r.display_order - 1, true
FROM mediatheque_learning_paths p
JOIN mediatheque_resources r ON r.slug LIKE 'batir-sur-le-roc-2-%'
WHERE p.slug = 'batir-sur-le-roc-pilier-2'
ON CONFLICT (learning_path_id, resource_id) DO NOTHING;

-- ───────────── Pilier 3 — Bilan de maturité & préparation multidimensionnelle ─────────────

INSERT INTO mediatheque_learning_paths (title, slug, description, objective, cover_url, level, estimated_duration, sort_order, status, published_at)
VALUES (
  'Bâtir sur le roc · Pilier 3 — Bilan de maturité & préparation multidimensionnelle',
  'batir-sur-le-roc-pilier-3',
  'Faire le point, dimension par dimension — spirituelle, émotionnelle, financière, sociale, physique et affective — pour savoir en vérité si l''on est prêt(e) à assumer la responsabilité d''un foyer.',
  'Faire le bilan de sa maturité avant de choisir un conjoint.',
  '/formation/batir-sur-le-roc/images/pilier-3.webp',
  'beginner', 'environ 1 h', 2, 'published', now()
)
ON CONFLICT (slug) DO NOTHING;

-- Parcours déjà créé sans image (première version de ce fichier) : affiche du pilier.
UPDATE mediatheque_learning_paths
SET cover_url = '/formation/batir-sur-le-roc/images/pilier-3.webp', updated_at = now()
WHERE slug = 'batir-sur-le-roc-pilier-3'
  AND (cover_url IS NULL OR cover_url = '' OR cover_url IN ('/formation/batir-sur-le-roc/images/couverture.webp', '/batir_roc.png', '/batir_roc.webp'));

WITH lessons(n, slug, title, description, minutes, page, pdf, thumb, cover) AS (
  VALUES
    (1, 'batir-sur-le-roc-3-1-la-maturite-spirituelle', 'Leçon 3.1 — La maturité spirituelle : autonomie de foi et leadership spirituel',
        'Découvrir pourquoi une spiritualité dépendante condamne le couple à la fragilité, et apprendre à bâtir une autonomie de foi inébranlable et un leadership spirituel selon le modèle du Christ.', '7 min',
        '/dashboard/academie/batir-sur-le-roc/3-1', '/formation/batir-sur-le-roc/pdf/lecon-3-1-la-maturite-spirituelle.pdf', '/formation/batir-sur-le-roc/images/lecon-3-1-carte.webp', '/formation/batir-sur-le-roc/images/lecon-3-1.webp'),
    (2, 'batir-sur-le-roc-3-2-la-maturite-emotionnelle', 'Leçon 3.2 — La maturité émotionnelle : maîtrise de soi, gestion du stress et de la colère',
        'Démasquer les mécanismes destructeurs de la colère et de l''impulsivité, et apprendre à cultiver la maîtrise de soi pour devenir un havre de paix et de sécurité émotionnelle pour ton futur foyer.', '7 min',
        '/dashboard/academie/batir-sur-le-roc/3-2', '/formation/batir-sur-le-roc/pdf/lecon-3-2-la-maturite-emotionnelle.pdf', '/formation/batir-sur-le-roc/images/lecon-3-2-carte.webp', '/formation/batir-sur-le-roc/images/lecon-3-2.webp'),
    (3, 'batir-sur-le-roc-3-3-la-maturite-financiere', 'Leçon 3.3 — La maturité financière : budget, gestion des dettes, épargne et vision financière du foyer',
        'Démasquer les illusions financières, apprendre la transparence absolue avant l''alliance, et poser les bases d''une gestion budgétaire biblique et prévoyante pour ton futur foyer.', '7 min',
        '/dashboard/academie/batir-sur-le-roc/3-3', '/formation/batir-sur-le-roc/pdf/lecon-3-3-la-maturite-financiere.pdf', '/formation/batir-sur-le-roc/images/lecon-3-3-carte.webp', '/formation/batir-sur-le-roc/images/lecon-3-3.webp'),
    (4, 'batir-sur-le-roc-3-4-la-maturite-sociale-et-professionnelle', 'Leçon 3.4 — La maturité sociale et professionnelle : équilibre carrière, ministère et vie de famille',
        'Apprendre à harmoniser ton travail, tes ministères et ta vie sociale afin de bâtir un emploi du temps équilibré et prêt à accueillir l''alliance conjugale.', '6 min',
        '/dashboard/academie/batir-sur-le-roc/3-4', '/formation/batir-sur-le-roc/pdf/lecon-3-4-la-maturite-sociale-et-professionnelle.pdf', '/formation/batir-sur-le-roc/images/lecon-3-4-carte.webp', '/formation/batir-sur-le-roc/images/lecon-3-4.webp'),
    (5, 'batir-sur-le-roc-3-5-la-preparation-physique', 'Leçon 3.5 — La préparation physique et l''hygiène de vie dans le couple',
        'Découvrir la valeur spirituelle et relationnelle du corps, éliminer les addictions cachées (pornographie, substances) et bâtir une hygiène de vie digne de l''Alliance.', '6 min',
        '/dashboard/academie/batir-sur-le-roc/3-5', '/formation/batir-sur-le-roc/pdf/lecon-3-5-la-preparation-physique.pdf', '/formation/batir-sur-le-roc/images/lecon-3-5-carte.webp', '/formation/batir-sur-le-roc/images/lecon-3-5.webp'),
    (6, 'batir-sur-le-roc-3-6-les-5-langages-de-l-amour', 'Leçon 3.6 — Les 5 langages de l''amour et la gestion des réservoirs affectifs',
        'Découvrir les 5 langages de l''amour, comprendre le mécanisme du réservoir affectif, et développer la flexibilité relationnelle nécessaire pour aimer l''autre selon ses besoins réels.', '6 min',
        '/dashboard/academie/batir-sur-le-roc/3-6', '/formation/batir-sur-le-roc/pdf/lecon-3-6-les-5-langages-de-l-amour.pdf', '/formation/batir-sur-le-roc/images/lecon-3-6-carte.webp', '/formation/batir-sur-le-roc/images/lecon-3-6.webp'),
    (7, 'batir-sur-le-roc-3-7-auto-evaluation-globale', 'Leçon 3.7 — Auto-évaluation globale : suis-je prêt(e) à assumer la responsabilité du mariage ?',
        'La check-list de maturité devant Dieu : suis-je prêt(e) à assumer la charge d''un foyer ?', '7 min',
        '/dashboard/academie/batir-sur-le-roc/3-7', '/formation/batir-sur-le-roc/pdf/lecon-3-7-auto-evaluation-globale.pdf', '/formation/batir-sur-le-roc/images/lecon-3-7-carte.webp', '/formation/batir-sur-le-roc/images/lecon-3-7.webp')
)
INSERT INTO mediatheque_resources (
  title, slug, description, type, category_id, author, source, external_url, file_url,
  thumbnail_url, cover_url, duration, language, level, target_audience, status, featured, recommended,
  display_order, published_at
)
SELECT
  l.title, l.slug, l.description, 'guide',
  (SELECT id FROM mediatheque_categories WHERE slug = 'preparation-mariage'),
  'Garden of Alliance', 'Formation « Bâtir sur le roc »',
  l.page, l.pdf, l.thumb, l.cover,
  l.minutes, 'fr', 'beginner', 'Célibataires', 'published', false, true,
  l.n, now()
FROM lessons l
ON CONFLICT (slug) DO NOTHING;

-- Étapes du parcours, dans l'ordre des leçons.
INSERT INTO mediatheque_learning_path_resources (learning_path_id, resource_id, sort_order, is_required)
SELECT p.id, r.id, r.display_order - 1, true
FROM mediatheque_learning_paths p
JOIN mediatheque_resources r ON r.slug LIKE 'batir-sur-le-roc-3-%'
WHERE p.slug = 'batir-sur-le-roc-pilier-3'
ON CONFLICT (learning_path_id, resource_id) DO NOTHING;
