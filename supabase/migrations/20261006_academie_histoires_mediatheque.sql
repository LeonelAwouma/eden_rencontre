-- ============================================================
--  Médiathèque : les histoires de l'Académie du mariage
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être rejoué sans créer de doublons.
--
--  Comme les leçons de « Bâtir sur le roc » (20260922_batir_sur_le_roc_pilier1.sql),
--  chaque histoire est référencée comme ressource de la médiathèque (type « Livre »)
--  pour apparaître dans l'onglet Ressources de l'admin. Le texte vit dans le code
--  (src/lib/formation/stories.ts) ; les couvertures dans public/formation/histoires/.
--  Généré depuis stories.ts : titres, résumés et durées identiques à l'Académie.
-- ============================================================

WITH stories(n, slug, title, description, minutes) AS (
  VALUES
    (1, 'quand-l-amour-retrousse-ses-manches', 'Quand l''Amour Retrousse ses Manches',
        'Nathalie, 26 ans, vit dans le rêve d''un amour romantique où la passion doit être naturelle, fluide et sans effort. Lorsqu''elle rencontre Éric, un jeune ingénieur passionné et dévoué, tout semble parfait lors des premiers mois. Mais lorsque les premières épreuves du quotidien surviennent — fatigue extrême, contraintes familiales et divergences de priorités —, Nathalie panique, interprétant ces frictions comme la fin de l''amour. À travers les enseignements du cursus Bâtir sur le Roc et l''exemple de maturité d''Éric, elle découvre que le véritable amour d''alliance ne s''arrête pas quand l''émotion baisse : c''est au contraire le moment où il retrousse ses manches pour bâtir.',
        '5 min'),
    (2, 'le-passeport-pour-l-alliance', 'Le Passeport pour l''Alliance',
        'Kevin, 30 ans, vit dans l''obsession de quitter son pays pour trouver un « avenir meilleur » à l''étranger. Voyant le mariage comme un simple moyen de transport et un billet de sortie, il s''inscrit sur des plateformes en ligne dans l''espoir de trouver une partenaire résidant en Europe ou en Amérique. C''est en échangeant avec Grâce, une jeune femme vivant à l''étranger mais profondément ancrée dans la foi, que ses motivations vont être ébranlées. Grâce refuse de jouer le rôle d''un « passeport relationnel » et l''invite d''abord à suivre la formation Bâtir sur le Roc. Au fil des leçons, Dieu transforme radicalement le cœur de Kevin : d''un chercheur d''opportunités, il devient un homme de vision et d''alliance, prêt à bâtir un sanctuaire solide sur le Roc de Christ.',
        '5 min'),
    (3, 'l-echo-du-sanctuaire', 'L''Écho du Sanctuaire',
        'Deux amis proches, David et Christian, s''engagent dans des fréquentations. David, un jeune homme impulsif et dynamique, fait la rencontre de Johanna, une femme posée, réfléchie et profondément à l''écoute. Malgré leurs différences de tempérament, ils apprennent à bâtir un espace de sécurité émotionnelle où l''on désarme. De leur côté, Christian et Héléna se ressemblent en tout point et partagent le même goût pour les sorties, mais leur relation repose sur la performance et le divertissement. Face à la première tempête et à la fatigue du quotidien, leurs deux visions s''affrontent : l''une transforme l''épreuve en un refuge de grâce, l''autre détruit l''alliance sur le ring des déceptions.',
        '6 min'),
    (4, 'au-dela-des-paralleles', 'Au-delà des Parallèles',
        'Grace, 25 ans, vient d''obtenir son diplôme d''ingénieure en génie civil. Alors qu''elle cherche son premier emploi, sa vie devient le théâtre d''un dilemme : d''un côté, des prétendants aisés mais sans foi réelle lui offrent un avenir matériel confortable ; de l''autre, David, un jeune frère en Christ passionné, brillant mais encore sans opportunités concrètes, incarne une vision partagée. C''est en découvrant la vraie dimension de l''Ezer Kenegdo que Grace comprend que le mariage n''est pas une question de statut actuel, mais de destinée commune.',
        '4 min')
)
INSERT INTO mediatheque_resources (
  title, slug, description, type, category_id, author, source, external_url,
  thumbnail_url, cover_url, duration, language, level, target_audience, status, featured, recommended,
  display_order, published_at
)
SELECT
  s.title, 'histoire-' || s.slug, s.description, 'book',
  (SELECT id FROM mediatheque_categories WHERE slug = 'preparation-mariage'),
  'Garden of Alliance', 'Histoires de l''Académie du mariage',
  '/dashboard/academie/histoires/' || s.slug,
  '/formation/histoires/' || s.slug || '.webp',
  '/formation/histoires/' || s.slug || '.webp',
  s.minutes, 'fr', 'beginner', 'Célibataires', 'published', false, true,
  100 + s.n, now()
FROM stories s
ON CONFLICT (slug) DO NOTHING;

-- Résumé du « Passeport pour l'Alliance » allégé le 2026-10-06 (la plateforme n'est
-- plus présentée comme la cause du dénouement). Si cette migration a déjà été
-- exécutée avec l'ancien texte, on le remplace — seulement s'il n'a pas été
-- retouché depuis dans l'admin.
UPDATE mediatheque_resources
SET description = 'Kevin, 30 ans, vit dans l''obsession de quitter son pays pour trouver un « avenir meilleur » à l''étranger. Voyant le mariage comme un simple moyen de transport et un billet de sortie, il s''inscrit sur des plateformes en ligne dans l''espoir de trouver une partenaire résidant en Europe ou en Amérique. C''est en échangeant avec Grâce, une jeune femme vivant à l''étranger mais profondément ancrée dans la foi, que ses motivations vont être ébranlées. Grâce refuse de jouer le rôle d''un « passeport relationnel » et l''invite d''abord à suivre la formation Bâtir sur le Roc. Au fil des leçons, Dieu transforme radicalement le cœur de Kevin : d''un chercheur d''opportunités, il devient un homme de vision et d''alliance, prêt à bâtir un sanctuaire solide sur le Roc de Christ.', updated_at = now()
WHERE slug = 'histoire-le-passeport-pour-l-alliance'
  AND description = 'Kevin, 30 ans, vit dans l''obsession de quitter son pays pour trouver un « avenir meilleur » à l''étranger. Voyant le mariage comme un simple moyen de transport et un billet de sortie, il s''inscrit sur des plateformes en ligne dans l''espoir de trouver une partenaire résidant en Europe ou en Amérique. C''est en échangeant avec Grâce, une jeune femme vivant à l''étranger mais profondément ancrée dans la foi, que ses motivations vont être ébranlées. Grâce refuse de jouer le rôle d''un « passeport relationnel » et l''invite à suivre la formation Bâtir sur le Roc sur Garden of Alliance. Ce parcours transforme radicalement la vision de Kevin : d''un chercheur d''opportunités, il devient un homme de vision et d''alliance, prêt à bâtir un sanctuaire solide sur le Roc de Christ.';
