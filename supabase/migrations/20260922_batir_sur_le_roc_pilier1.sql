-- Formation « Bâtir sur le roc » — Pilier 1 : La vision sacrée du mariage.
-- Référence les six leçons dans la médiathèque et les regroupe dans un parcours.
-- Le texte des leçons vit dans le code (src/lib/formation/batir-sur-le-roc.ts) ;
-- images et PDF sont servis depuis public/formation/batir-sur-le-roc/.
-- Idempotent : peut être rejoué sans créer de doublons.

INSERT INTO mediatheque_learning_paths (title, slug, description, objective, level, estimated_duration, sort_order, status, published_at)
VALUES (
  'Bâtir sur le roc · Pilier 1 — La vision sacrée du mariage',
  'batir-sur-le-roc-pilier-1',
  'Déposer nos illusions pour embrasser la vision que Dieu a de l''alliance : un sanctuaire, un but commun, un engagement sans retour, un service mutuel et la présence de Dieu au centre.',
  'Poser la première pierre de la préparation au mariage : la vision.',
  'beginner', '6 leçons · environ 1 h', 0, 'published', now()
)
ON CONFLICT (slug) DO NOTHING;

WITH lessons(n, slug, title, description, minutes, file) AS (
  VALUES
    (1, 'batir-sur-le-roc-1-1-entre-eloge-et-realite', 'Leçon 1.1 — Entre éloge et réalité',
        'Déposer les lunettes déformantes de l''idéalisation et du cynisme pour embrasser la vision claire de l''Alliance.', '8 min',
        'lecon-1-1-entre-eloge-et-realite'),
    (2, 'batir-sur-le-roc-1-2-le-mariage-comme-sanctuaire', 'Leçon 1.2 — Le mariage comme sanctuaire',
        'Le foyer chrétien, refuge où l''on peut ôter son armure : ni ring de boxe, ni scène de théâtre.', '8 min',
        'lecon-1-2-le-mariage-comme-sanctuaire'),
    (3, 'batir-sur-le-roc-1-3-le-mariage-comme-reponse-a-un-but', 'Leçon 1.3 — Le mariage comme réponse à un but',
        'Le mariage n''est pas une destination mais un véhicule : la destinée commune et l''Ezer Kenegdo.', '9 min',
        'lecon-1-3-le-mariage-comme-reponse-a-un-but'),
    (4, 'batir-sur-le-roc-1-4-alignement-theologique-et-spirituel', 'Leçon 1.4 — Alignement théologique et spirituel',
        'Contrat ou alliance : le sceau du sacrifice, et le danger du joug inégal.', '9 min',
        'lecon-1-4-alignement-theologique-et-spirituel'),
    (5, 'batir-sur-le-roc-1-5-le-renoncement-et-le-service-mutuel', 'Leçon 1.5 — Le renoncement et le service mutuel',
        'Le renoncement qui libère, le service qui amplifie — sans tomber dans le martyre émotionnel.', '10 min',
        'lecon-1-5-le-renoncement-et-le-service-mutuel'),
    (6, 'batir-sur-le-roc-1-6-l-autel-familial-et-la-presence-de-dieu', 'Leçon 1.6 — L''autel familial et la présence de Dieu',
        'Le cordon à trois fils : pourquoi la présence de Dieu est le socle du foyer.', '9 min',
        'lecon-1-6-l-autel-familial-et-la-presence-de-dieu')
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
  '/dashboard/academie/batir-sur-le-roc/1-' || l.n,
  '/formation/batir-sur-le-roc/pdf/' || l.file || '.pdf',
  '/formation/batir-sur-le-roc/images/lecon-1-' || l.n || '-carte.webp',
  '/formation/batir-sur-le-roc/images/lecon-1-' || l.n || '.webp',
  l.minutes, 'fr', 'beginner', 'Célibataires', 'published', l.n = 1, true,
  l.n, now()
FROM lessons l
ON CONFLICT (slug) DO NOTHING;

-- Étapes du parcours, dans l'ordre des leçons.
INSERT INTO mediatheque_learning_path_resources (learning_path_id, resource_id, sort_order, is_required)
SELECT p.id, r.id, r.display_order - 1, true
FROM mediatheque_learning_paths p
JOIN mediatheque_resources r ON r.slug LIKE 'batir-sur-le-roc-1-%'
WHERE p.slug = 'batir-sur-le-roc-pilier-1'
ON CONFLICT (learning_path_id, resource_id) DO NOTHING;
